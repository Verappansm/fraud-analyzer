import { NextResponse } from "next/server";
import { mapToSignals, normalizeArticles, normalizeFilings } from "@/lib/aggregator";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/cache";
import { runOpenAIRiskAnalysis } from "@/lib/openai";
import { connectMongo } from "@/lib/mongodb";
import { aggregateSentiment } from "@/lib/sentimentScorer";
import { fetchAlphaVantageOverview } from "@/lib/sources/alphaVantage";
import {
  fetchCompanyProfile,
  fetchOfficers,
  performDirectorNetworkAnalysis,
  searchCompany,
} from "@/lib/sources/companiesHouse";
import { fetchGoogleNews } from "@/lib/sources/googleNewsRSS";
import { fetchRecentFilings, resolveTickerFromSec } from "@/lib/sources/secEdgar";
import { getHighestSeverity } from "@/lib/taxonomy";
import Analysis from "@/models/Analysis";
import Article from "@/models/Article";
import Company from "@/models/Company";
import type { AnalyzeResponse, HistoryItem } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnalyzeRequest {
  company?: string;
  stream?: boolean;
}

interface StreamEvent {
  type: "status" | "result" | "error";
  message?: string;
  payload?: AnalyzeResponse;
}

async function persistAnalysis(
  companyName: string,
  ticker: string | null,
  response: AnalyzeResponse,
  rawLlmOutput: string,
  llmPrompt: string,
): Promise<void> {
  try {
    await connectMongo();

    const company = await Company.findOneAndUpdate(
      { name: companyName },
      {
        $set: { ticker, lastQueried: new Date() },
        $inc: { queryCount: 1 },
      },
      { new: true, upsert: true },
    );

    if (!company?._id) {
      return;
    }

    if (response.news.length > 0) {
      await Article.insertMany(
        response.news.map((article) => ({
          companyId: company._id,
          title: article.title,
          source: article.source,
          url: article.url,
          date: new Date(article.date),
          sentiment: article.sentiment,
          sentimentScore: article.sentimentScore,
          relevanceScore: article.relevanceScore,
        })),
        { ordered: false },
      ).catch(() => {
        // Avoid failing request for duplicate insert races.
      });
    }

    await Analysis.create({
      companyId: company._id,
      riskScore: response.riskScore,
      confidence: response.confidence,
      recommendation: response.recommendation,
      analysis: response.analysis,
      whyScore: response.whyScore,
      fraudSignals: response.fraudSignals,
      legalRisks: response.legalRisks,
      sentimentTrend: response.sentimentTrend,
      sources: response.sources,
      signals: response.signals,
      vectorRow: response.vectorRow,
      rawLlmOutput,
      llmPrompt,
    });
  } catch {
    // Persistence should not block returning analysis.
  }
}

async function runPipeline(
  companyName: string,
  emitStatus?: (message: string) => void,
): Promise<AnalyzeResponse> {
  emitStatus?.("Checking ticker and SEC identity...");
  const identity = await resolveTickerFromSec(companyName);

  emitStatus?.("Fetching news, financials, and UK signals in parallel...");
  const [rawNews, financials, ukCompany] = await Promise.all([
    fetchGoogleNews(companyName),
    fetchAlphaVantageOverview(identity.ticker),
    searchCompany(companyName),
  ]);

  let chProfile = null;
  let chOfficers = [];
  let directorAnalysis = null;

  if (ukCompany) {
    emitStatus?.(`Found UK Company: ${ukCompany.title} (${ukCompany.company_number})`);
    [chProfile, chOfficers] = await Promise.all([
      fetchCompanyProfile(ukCompany.company_number),
      fetchOfficers(ukCompany.company_number),
    ]);
    
    emitStatus?.("Performing Director Network Analysis...");
    directorAnalysis = await performDirectorNetworkAnalysis(chOfficers);
  }

  emitStatus?.("Normalizing, deduplicating, and mapping signals...");
  const news = normalizeArticles(rawNews).slice(0, 20);
  const filings = normalizeFilings([]); // We use UK signals instead of SEC if available
  const sentiment = aggregateSentiment(news);
  
  const { signals, vectorRow } = mapToSignals(news, chProfile, directorAnalysis);

  emitStatus?.("Running OpenAI risk analysis with full signal stack...");
  const llm = await runOpenAIRiskAnalysis(companyName, news.slice(0, 12), financials, signals);

  const analyzedAt = new Date().toISOString();
  const response: AnalyzeResponse = {
    riskScore: llm.parsed.riskScore,
    confidence: llm.parsed.confidence,
    recommendation: llm.parsed.recommendation,
    analysis: llm.parsed.analysis,
    whyScore: llm.parsed.whyScore,
    fraudSignals: llm.parsed.fraudSignals,
    legalRisks: llm.parsed.legalRisks,
    sentimentTrend: llm.parsed.sentimentTrend || sentiment.trend,
    signals,
    vectorRow,
    sources: news.slice(0, 8).map((item) => ({
      title: item.title,
      url: item.url,
      date: item.date,
    })),
    news,
    financials,
    filings,
    cached: false,
    analyzedAt,
  };

  emitStatus?.("Persisting analysis and refreshing cache...");
  await persistAnalysis(companyName, identity.ticker, response, llm.rawText, llm.prompt);
  setCachedAnalysis(companyName, response);

  return response;
}

function encodeEvent(event: StreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request) {
  let payload: AnalyzeRequest;

  try {
    payload = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const companyName = payload.company?.trim();
  if (!companyName) {
    return NextResponse.json({ error: "company is required" }, { status: 400 });
  }

  const cached = getCachedAnalysis(companyName);
  if (cached) {
    return NextResponse.json(cached);
  }

  const wantsStream = Boolean(payload.stream);

  if (!wantsStream) {
    try {
      const result = await runPipeline(companyName);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Analysis failed" },
        { status: 500 },
      );
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(encodeEvent(event)));

      runPipeline(companyName, (message) => {
        send({ type: "status", message });
      })
        .then((result) => {
          send({ type: "result", payload: result });
          controller.close();
        })
        .catch((error) => {
          send({
            type: "error",
            message: error instanceof Error ? error.message : "Analysis failed",
          });
          controller.close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

export async function GET() {
  try {
    await connectMongo();

    const rows = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(12)
      .populate("companyId", "name")
      .lean();

    const history: HistoryItem[] = rows.map((row) => {
      const company = row.companyId as { name?: string } | null;
      return {
        id: String(row._id),
        company: company?.name ?? "Unknown",
        riskScore: row.riskScore,
        confidence: row.confidence,
        recommendation: row.recommendation,
        createdAt: new Date(row.createdAt).toISOString(),
      };
    });

    return NextResponse.json({ history });
  } catch {
    return NextResponse.json({ history: [] });
  }
}
