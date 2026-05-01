import { createOpenAIClient } from "./openaiClient";
import type { CompanyInput, IdentityProfile, GovernanceRiskAssessment, AgentSignalProposal } from "./types";

const SYSTEM_PROMPT = `You are a corporate governance specialist supporting American Express UK underwriting.

ROLE: Identify governance weaknesses and director risk patterns that indicate elevated credit risk for UK businesses.

Analyse: director history, serial failure patterns, filing compliance, ownership structure, board stability, related-party concerns, and beneficial ownership transparency.

GOVERNANCE SIGNAL TAXONOMY (propose ONLY these codes):
G00: Director linked to 2–3 previously failed companies (HIGH)
G01: Director linked to 4+ previously failed companies — serial failure (CRITICAL)
G02: Multiple director resignations (2+ in 12 months) (MEDIUM)
G03: Accounts filing overdue (MEDIUM)
G04: Confirmation statement overdue (MEDIUM)
G05: Registered office address in dispute (LOW)
G06: Significant ownership change detected (MEDIUM)

RULES:
1. Only propose signals G00–G06. Do not invent other codes.
2. evidenceBasis: "known" = specific training data, "inferred" = typical for this type, "user_provided" = from provided context.
3. G00 and G01 require specific evidence of director failure history — do not infer without basis.
4. New companies (incorporated <2 years) commonly have G03/G04 overdue — flag only if contextually relevant.

Return ONLY valid JSON — no markdown, no explanation:
{
  "signals": [{ "code": string, "rationale": string, "confidence": "low"|"medium"|"high", "evidenceBasis": "known"|"inferred"|"user_provided" }],
  "directorConcerns": string[],
  "structureConcerns": string[],
  "filingCompliance": "compliant"|"concerns"|"overdue"|"unknown",
  "notes": string
}`;

function buildUserMessage(input: CompanyInput, identity: IdentityProfile): string {
  const parts = [
    `COMPANY: ${input.name}`,
    `CLASSIFICATION: ${identity.businessType} | ${identity.industry} | ${identity.jurisdiction}`,
    `KNOWN PUBLICLY: ${identity.knownPublicly}`,
  ];
  if (input.context) parts.push(`ANALYST CONTEXT: ${input.context}`);
  if (input.financials) {
    const f = input.financials;
    if (f.incorporationYear) parts.push(`INCORPORATED: ${f.incorporationYear}`);
    if (f.employees) parts.push(`EMPLOYEES: ${f.employees}`);
  }
  if (identity.inherentRiskFactors.length) {
    parts.push(`INHERENT RISK FACTORS: ${identity.inherentRiskFactors.join("; ")}`);
  }
  return parts.join("\n");
}

const VALID_CODES = new Set(["G00", "G01", "G02", "G03", "G04", "G05", "G06"]);
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

export async function runGovernanceAgent(
  input: CompanyInput,
  identity: IdentityProfile,
): Promise<GovernanceRiskAssessment> {
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
  const validComp = ["compliant", "concerns", "overdue", "unknown"] as const;
  return {
    signals: sanitizeSignals(raw.signals),
    directorConcerns: Array.isArray(raw.directorConcerns) ? raw.directorConcerns.map(String).slice(0, 6) : [],
    structureConcerns: Array.isArray(raw.structureConcerns) ? raw.structureConcerns.map(String).slice(0, 4) : [],
    filingCompliance: validComp.find(c => c === raw.filingCompliance) ?? "unknown",
    notes: String(raw.notes ?? ""),
  };
}
