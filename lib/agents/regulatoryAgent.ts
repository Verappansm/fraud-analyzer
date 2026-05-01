import { createOpenAIClient } from "./openaiClient";
import type { CompanyInput, IdentityProfile, RegulatoryRiskAssessment, AgentSignalProposal } from "./types";

const SYSTEM_PROMPT = `You are a UK regulatory compliance expert supporting American Express underwriting.

ROLE: Identify regulatory risks across all UK regulatory bodies for a business seeking £100,000+ credit exposure.

Assess exposure to: FCA (financial services conduct), HMRC (tax compliance), ICO (data protection/GDPR), CMA (competition law), HSE (health & safety), Environment Agency, Pensions Regulator, and sector-specific regulators (e.g. CQC for healthcare, SRA for legal).

REGULATORY SIGNAL TAXONOMY (propose ONLY these codes):
R00: FCA enforcement action (HIGH)
R01: FCA warning list match (CRITICAL)
R02: ICO data protection enforcement (HIGH)
R03: CMA competition investigation (HIGH)
R04: HSE health and safety prosecution (HIGH)
R05: HMRC deliberate defaulter list (HIGH)
R06: HMRC tax avoidance scheme (MEDIUM)
R07: Environment Agency violation (MEDIUM)
R08: Pensions Regulator action (MEDIUM)
R09: Regulatory licence revoked or suspended (MEDIUM)

RULES:
1. Only propose signals R00–R09. Do not invent other codes.
2. Consider the industry's regulatory environment — financial services, healthcare, and construction have elevated inherent regulatory risk.
3. evidenceBasis: "known" = specific training data events, "inferred" = typical for this industry, "user_provided" = from provided context.
4. R01 (FCA warning list) requires specific evidence — do not infer without basis.

Return ONLY valid JSON — no markdown, no explanation:
{
  "signals": [{ "code": string, "rationale": string, "confidence": "low"|"medium"|"high", "evidenceBasis": "known"|"inferred"|"user_provided" }],
  "primaryRegulators": string[],
  "complianceFlags": string[],
  "regulatoryExposureLevel": "low"|"medium"|"high"|"unknown",
  "notes": string
}`;

function buildUserMessage(input: CompanyInput, identity: IdentityProfile): string {
  const parts = [
    `COMPANY: ${input.name}`,
    `CLASSIFICATION: ${identity.businessType} | ${identity.industry} | ${identity.sector} | ${identity.jurisdiction}`,
    `KNOWN PUBLICLY: ${identity.knownPublicly}`,
  ];
  if (input.context) parts.push(`ANALYST CONTEXT: ${input.context}`);
  if (input.financials?.description) parts.push(`BUSINESS DESCRIPTION: ${input.financials.description}`);
  if (identity.inherentRiskFactors.length) {
    parts.push(`INHERENT RISK FACTORS: ${identity.inherentRiskFactors.join("; ")}`);
  }
  return parts.join("\n");
}

const VALID_CODES = new Set(["R00", "R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09"]);
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

export async function runRegulatoryAgent(
  input: CompanyInput,
  identity: IdentityProfile,
): Promise<RegulatoryRiskAssessment> {
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
  const validLevel = ["low", "medium", "high", "unknown"] as const;
  return {
    signals: sanitizeSignals(raw.signals),
    primaryRegulators: Array.isArray(raw.primaryRegulators) ? raw.primaryRegulators.map(String).slice(0, 5) : [],
    complianceFlags: Array.isArray(raw.complianceFlags) ? raw.complianceFlags.map(String).slice(0, 6) : [],
    regulatoryExposureLevel: validLevel.find(l => l === raw.regulatoryExposureLevel) ?? "unknown",
    notes: String(raw.notes ?? ""),
  };
}
