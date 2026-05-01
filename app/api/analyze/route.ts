import { NextResponse } from "next/server";
import { normalizeArticles } from "@/lib/aggregator";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/cache";
import { connectMongo } from "@/lib/mongodb";
import { aggregateSentiment } from "@/lib/sentimentScorer";
import { getHighestSeverity } from "@/lib/taxonomy";
import { runIdentityAgent } from "@/lib/agents/identityAgent";
import { runFinancialAgent } from "@/lib/agents/financialAgent";
import { runGovernanceAgent } from "@/lib/agents/governanceAgent";
import { runRegulatoryAgent } from "@/lib/agents/regulatoryAgent";
import { runReputationalAgent } from "@/lib/agents/reputationalAgent";
import { runSignalAgent } from "@/lib/agents/signalAgent";
import { runSynthesisAgent } from "@/lib/agents/synthesisAgent";
import Analysis from "@/models/Analysis";
import Article from "@/models/Article";
import Company from "@/models/Company";
import type { AnalyzeResponse, AgentTrace, HistoryItem, NormalizedArticle, UserFinancials } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnalyzeRequest {
  company?: string;
  stream?: boolean;
  context?: string;
  financials?: UserFinancials;
}

interface StreamEvent {
  type: "status" | "result" | "error";
  message?: string;
  payload?: AnalyzeResponse;
}

function buildIntelligenceItems(
  newsFlags: string[],
  knownControversies: string[],
  reputationalNotes: string,
  sentiment: "positive" | "neutral" | "negative" | "unknown",
): NormalizedArticle[] {
  const today = new Date().toISOString();
  const effectiveSentiment = sentiment === "unknown" ? "neutral" : sentiment;
  const sentimentScore = effectiveSentiment === "negative" ? -3 : effectiveSentiment === "positive" ? 2 : 0;

  const items: NormalizedArticle[] = [];

  for (let i = 0; i < newsFlags.length; i++) {
    items.push({
      title: newsFlags[i],
      source: "AI Reputational Intelligence",
      date: today,
      summary: reputationalNotes,
      url: "",
      sentiment: effectiveSentiment,
      sentimentScore,
      relevanceScore: Math.max(10 - i, 1),
    });
  }

  for (let i = 0; i < knownControversies.length; i++) {
    items.push({
      title: knownControversies[i],
      source: "AI Historical Intelligence",
      date: today,
      summary: "Known controversy from intelligence analysis",
      url: "",
      sentiment: "negative",
      sentimentScore: -4,
      relevanceScore: Math.max(8 - i, 1),
    });
  }

  return items;
}

function buildFinancialSnapshot(financials: UserFinancials | undefined) {
  if (!financials) return null;
  const { turnover, netProfit } = financials;
  return {
    ticker: null,
    marketCap: null,
    pe: null,
    eps: null,
    beta: null,
    revenueTTM: turnover ?? null,
    profitMargin: turnover && netProfit ? netProfit / turnover : null,
    operatingMarginTTM: null,
    returnOnAssetsTTM: null,
    returnOnEquityTTM: null,
    analystTargetPrice: null,
    week52High: null,
    week52Low: null,
  };
}

async function persistAnalysis(
  companyName: string,
  response: AnalyzeResponse,
  rawLlmOutput: string,
  llmPrompt: string,
): Promise<void> {
  try {
    await connectMongo();

    const company = await Company.findOneAndUpdate(
      { name: companyName },
      {
        $set: { ticker: null, lastQueried: new Date() },
        $inc: { queryCount: 1 },
      },
      { new: true, upsert: true },
    );

    if (!company?._id) return;

    const intelligenceItems = response.news.filter(n => n.url === "");
    if (intelligenceItems.length > 0) {
      await Article.insertMany(
        intelligenceItems.map(a => ({
          companyId: company._id,
          title: a.title,
          source: a.source,
          url: a.url || "internal",
          date: new Date(a.date),
          sentiment: a.sentiment,
          sentimentScore: a.sentimentScore,
          relevanceScore: a.relevanceScore,
        })),
        { ordered: false },
      ).catch(() => {});
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
      agentTrace: response.agentTrace ?? null,
      rawLlmOutput,
      llmPrompt,
    });
  } catch {
    // Persistence must not block the analysis response.
  }
}

async function runPipeline(
  companyName: string,
  context: string | undefined,
  userFinancials: UserFinancials | undefined,
  emitStatus?: (message: string) => void,
): Promise<AnalyzeResponse> {
  const companyInput = { name: companyName, context, financials: userFinancials };

  emitStatus?.("Running identity classification...");
  const identity = await runIdentityAgent(companyInput);

  emitStatus?.("Running specialist risk agents in parallel...");
  const [financial, governance, regulatory, reputational] = await Promise.all([
    runFinancialAgent(companyInput, identity),
    runGovernanceAgent(companyInput, identity),
    runRegulatoryAgent(companyInput, identity),
    runReputationalAgent(companyInput, identity),
  ]);

  emitStatus?.("Mapping signals to taxonomy...");
  const signalMap = await runSignalAgent(companyInput, identity, financial, governance, regulatory, reputational);

  emitStatus?.("Running final risk synthesis...");
  const synthesis = await runSynthesisAgent(
    companyInput, identity, financial, governance, regulatory, reputational, signalMap,
  );

  const intelligenceItems = buildIntelligenceItems(
    reputational.newsFlags,
    reputational.knownControversies,
    reputational.notes,
    reputational.publicSentiment,
  );
  const news = normalizeArticles(intelligenceItems).slice(0, 20);
  const sentiment = aggregateSentiment(news);
  const financialSnapshot = buildFinancialSnapshot(userFinancials);

  const agentTrace: AgentTrace = {
    identity: {
      industry: identity.industry,
      sector: identity.sector,
      jurisdiction: identity.jurisdiction,
      businessType: identity.businessType,
      estimatedSize: identity.estimatedSize,
      knownPublicly: identity.knownPublicly,
      inherentRiskFactors: identity.inherentRiskFactors,
      confidence: identity.confidence,
      notes: identity.notes,
    },
    financial: {
      overallFinancialHealth: financial.overallFinancialHealth,
      keyRisks: financial.keyRisks,
      mitigatingFactors: financial.mitigatingFactors,
      notes: financial.notes,
    },
    governance: {
      filingCompliance: governance.filingCompliance,
      directorConcerns: governance.directorConcerns,
      structureConcerns: governance.structureConcerns,
      notes: governance.notes,
    },
    regulatory: {
      regulatoryExposureLevel: regulatory.regulatoryExposureLevel,
      primaryRegulators: regulatory.primaryRegulators,
      complianceFlags: regulatory.complianceFlags,
      notes: regulatory.notes,
    },
    reputational: {
      publicSentiment: reputational.publicSentiment,
      newsFlags: reputational.newsFlags,
      knownControversies: reputational.knownControversies,
      notes: reputational.notes,
    },
  };

  const analyzedAt = new Date().toISOString();
  const response: AnalyzeResponse = {
    riskScore: synthesis.output.riskScore,
    confidence: synthesis.output.confidence,
    recommendation: synthesis.output.recommendation,
    analysis: synthesis.output.analysis,
    whyScore: synthesis.output.whyScore,
    fraudSignals: synthesis.output.fraudSignals,
    legalRisks: synthesis.output.legalRisks,
    sentimentTrend: synthesis.output.sentimentTrend || sentiment.trend,
    signals: signalMap.signals,
    vectorRow: signalMap.vectorRow as Record<import("@/lib/taxonomy").SignalCode, number>,
    sources: news.slice(0, 8).map(n => ({ title: n.title, url: n.url, date: n.date })),
    news,
    financials: financialSnapshot,
    filings: [],
    cached: false,
    analyzedAt,
    agentTrace,
  };

  emitStatus?.("Persisting analysis and refreshing cache...");
  await persistAnalysis(companyName, response, synthesis.rawText, synthesis.prompt);
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

  const context = payload.context?.trim() || undefined;
  const userFinancials = payload.financials || undefined;
  const wantsStream = Boolean(payload.stream);

  if (!wantsStream) {
    try {
      const result = await runPipeline(companyName, context, userFinancials);
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
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(encodeEvent(event)));

      runPipeline(companyName, context, userFinancials, message => {
        send({ type: "status", message });
      })
        .then(result => {
          send({ type: "result", payload: result });
          controller.close();
        })
        .catch(error => {
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

    const history: HistoryItem[] = rows.map(row => {
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
