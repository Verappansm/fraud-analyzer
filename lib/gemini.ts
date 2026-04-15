import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  FilingItem,
  FinancialSnapshot,
  LLMAnalysisOutput,
  NormalizedArticle,
} from "@/types";

const MODEL_NAME = "gemini-1.5-flash";

function clampRiskScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 50;
  }
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function normalizeEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  const str = String(value ?? "").toLowerCase();
  return (allowed.find((item) => item === str) ?? fallback) as T;
}

function buildPrompt(
  company: string,
  articles: NormalizedArticle[],
  financials: FinancialSnapshot | null,
  filings: FilingItem[],
): string {
  return [
    `You are a senior financial risk analyst at a global institution.`,
    `Analyze the following real data about ${company}.`,
    `Do NOT fabricate any facts. If data is missing, state uncertainty briefly in analysis bullet points.`,
    `ARTICLES: ${JSON.stringify(articles)}`,
    `FINANCIALS: ${JSON.stringify(financials)}`,
    `FILINGS: ${JSON.stringify(filings)}`,
    `Return STRICTLY this JSON:`,
    `{
  "riskScore": <0-100>,
  "confidence": <"low"|"medium"|"high">,
  "recommendation": <"low risk"|"monitor"|"high risk">,
  "analysis": [<bullet string>, ...],
  "whyScore": <paragraph explaining scoring>,
  "fraudSignals": [<string>, ...],
  "legalRisks": [<string>, ...],
  "sentimentTrend": <"positive"|"neutral"|"negative">
}`,
  ].join("\n");
}

function parseJsonResponse(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("LLM did not return parseable JSON.");
    }
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function sanitizeModelOutput(raw: Record<string, unknown>): LLMAnalysisOutput {
  const confidence = normalizeEnum(raw.confidence, ["low", "medium", "high"], "medium");
  const recommendation = normalizeEnum(raw.recommendation, ["low risk", "monitor", "high risk"], "monitor");
  const sentimentTrend = normalizeEnum(raw.sentimentTrend, ["positive", "neutral", "negative"], "neutral");

  const analysis = normalizeArray(raw.analysis).slice(0, 6);
  const fraudSignals = normalizeArray(raw.fraudSignals).slice(0, 8);
  const legalRisks = normalizeArray(raw.legalRisks).slice(0, 8);

  return {
    riskScore: clampRiskScore(raw.riskScore),
    confidence,
    recommendation,
    analysis: analysis.length > 0 ? analysis : ["Insufficient risk evidence in the available data."],
    whyScore: String(raw.whyScore ?? "The score reflects article sentiment, filing risk factors, and available financial context.").trim(),
    fraudSignals,
    legalRisks,
    sentimentTrend,
  };
}

export async function runGeminiRiskAnalysis(
  company: string,
  articles: NormalizedArticle[],
  financials: FinancialSnapshot | null,
  filings: FilingItem[],
): Promise<{ parsed: LLMAnalysisOutput; rawText: string; prompt: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const prompt = buildPrompt(company, articles, financials, filings);
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1000,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const rawText = result.response.text();
  const parsed = sanitizeModelOutput(parseJsonResponse(rawText));

  return { parsed, rawText, prompt };
}
