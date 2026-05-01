import { createOpenAIClient } from "./openaiClient";
import type { CompanyInput, IdentityProfile, ReputationalRiskAssessment, AgentSignalProposal } from "./types";

const SYSTEM_PROMPT = `You are a reputational intelligence analyst supporting American Express UK underwriting.

ROLE: Assess public perception, media risk, fraud allegations, and reputational events for a company.

Analyse: known news events, public controversies, fraud or misconduct allegations, data breach disclosures, customer sentiment patterns, senior leadership changes, and social media reputation.

REPUTATIONAL SIGNAL TAXONOMY (propose ONLY these codes):
P00: Fraud allegation in news (HIGH)
P01: HMRC investigation mentioned in news (HIGH)
P02: Misconduct or scandal in news (MEDIUM)
P03: Senior director departure reported (MEDIUM)
P04: Data breach reported (MEDIUM)
P05: Customer complaint pattern (reviews/social) (MEDIUM)
P06: Negative news mention (general) (MEDIUM)
P07: Social media reputational event (LOW)

RULES:
1. Only propose signals P00–P07. Do not invent other codes.
2. evidenceBasis: "known" = specific events from training data, "inferred" = typical for this industry/type, "user_provided" = from analyst context.
3. P00 (fraud allegation) requires specific evidence — do not propose for financial services companies purely on industry inference.
4. For "knownControversies": list only specific, real events you are confident about from training data. State "No known controversies from training data" if none.
5. For "newsFlags": list specific concerns or intelligence items relevant to the underwriting decision.
6. publicSentiment should be "unknown" if you have no substantiated basis to determine it.

Return ONLY valid JSON — no markdown, no explanation:
{
  "signals": [{ "code": string, "rationale": string, "confidence": "low"|"medium"|"high", "evidenceBasis": "known"|"inferred"|"user_provided" }],
  "publicSentiment": "positive"|"neutral"|"negative"|"unknown",
  "newsFlags": string[],
  "knownControversies": string[],
  "notes": string
}`;

function buildUserMessage(input: CompanyInput, identity: IdentityProfile): string {
  const parts = [
    `COMPANY: ${input.name}`,
    `CLASSIFICATION: ${identity.businessType} | ${identity.industry} | ${identity.jurisdiction}`,
    `KNOWN PUBLICLY: ${identity.knownPublicly}`,
    `INHERENT RISK FACTORS: ${identity.inherentRiskFactors.join("; ") || "None identified"}`,
  ];
  if (input.context) parts.push(`ANALYST CONTEXT: ${input.context}`);
  return parts.join("\n");
}

const VALID_CODES = new Set(["P00", "P01", "P02", "P03", "P04", "P05", "P06", "P07"]);
const VALID_CONF = ["low", "medium", "high"] as const;
const VALID_BASIS = ["known", "inferred", "user_provided"] as const;

function sanitizeSignals(raw: unknown): AgentSignalProposal[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .filter(s => VALID_CODES.has(String(s.code)))
    .map(s => ({
      code: String(s.code) as AgentSignalProposal["code"],
      rationale: String(s.rationale ?? ""),
      confidence: VALID_CONF.find(c => c === s.confidence) ?? "low",
      evidenceBasis: VALID_BASIS.find(b => b === s.evidenceBasis) ?? "inferred",
    }));
}

export async function runReputationalAgent(
  input: CompanyInput,
  identity: IdentityProfile,
): Promise<ReputationalRiskAssessment> {
  const client = createOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(input, identity) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  const raw = JSON.parse(response.choices[0].message.content ?? "{}") as Record<string, unknown>;
  const validSentiment = ["positive", "neutral", "negative", "unknown"] as const;
  return {
    signals: sanitizeSignals(raw.signals),
    publicSentiment: validSentiment.find(s => s === raw.publicSentiment) ?? "unknown",
    newsFlags: Array.isArray(raw.newsFlags) ? raw.newsFlags.map(String).slice(0, 10) : [],
    knownControversies: Array.isArray(raw.knownControversies) ? raw.knownControversies.map(String).slice(0, 6) : [],
    notes: String(raw.notes ?? ""),
  };
}
