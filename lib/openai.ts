import OpenAI from "openai";
import type {
  FinancialSnapshot,
  LLMAnalysisOutput,
  NormalizedArticle,
} from "@/types";

const MODEL_NAME = "gpt-4o";

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
  signals: any[],
): string {
  return [
    `You are a senior credit risk analyst at American Express UK.`,
    `Analyze the following real data about ${company} for a £100,000+ exposure account.`,
    `Do NOT fabricate any facts. If data is missing, state uncertainty briefly.`,
    `UK RISK SIGNALS: ${JSON.stringify(signals)}`,
    `ARTICLES: ${JSON.stringify(articles)}`,
    `FINANCIALS: ${JSON.stringify(financials)}`,
    `INSTRUCTIONS:`,
    `1. TAXONOMY: Map all findings to the signal codes provided in the UK RISK SIGNALS data.`,
    `2. RISK NARRATIVE: The "whyScore" field MUST be EXACTLY 3 sentences:`,
    `   - Sentence 1: Overall risk level and nature of concern.`,
    `   - Sentence 2: Most critical signal and its implication for the AmEx account.`,
    `   - Sentence 3: Recommended action (Monitor / Escalate / Immediate Review / No Action).`,
    `Return STRICTLY this JSON:`,
    `{
  "riskScore": <0-100>,
  "confidence": <"low"|"medium"|"high">,
  "recommendation": <"low risk"|"monitor"|"high risk">,
  "analysis": [<bullet string>, ...],
  "whyScore": <3-sentence narrative string>,
  "fraudSignals": [<string>, ...],
  "legalRisks": [<string>, ...],
  "sentimentTrend": <"positive"|"neutral"|"negative">
}`,
  ].join("\n");
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
    analysis: analysis.length > 0 ? analysis : ["Insufficient evidence."],
    whyScore: String(raw.whyScore ?? "").trim(),
    fraudSignals,
    legalRisks,
    sentimentTrend,
  };
}

export async function runOpenAIRiskAnalysis(
  company: string,
  articles: NormalizedArticle[],
  financials: FinancialSnapshot | null,
  signals: any[],
): Promise<{ parsed: LLMAnalysisOutput; rawText: string; prompt: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const openai = new OpenAI({ apiKey });
  const prompt = buildPrompt(company, articles, financials, signals);

  const response = await openai.chat.completions.create({
    model: MODEL_NAME,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const rawText = response.choices[0].message.content || "{}";
  const parsedRes = JSON.parse(rawText);
  const parsed = sanitizeModelOutput(parsedRes);

  return { parsed, rawText, prompt };
}
