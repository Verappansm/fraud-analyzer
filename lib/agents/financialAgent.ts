import { createOpenAIClient } from "./openaiClient";
import type { CompanyInput, IdentityProfile, FinancialRiskAssessment, AgentSignalProposal } from "./types";

const SYSTEM_PROMPT = `You are a senior credit risk analyst at American Express UK, specialising in SME financial risk for £100,000+ exposure accounts.

ROLE: Assess financial risk signals for a company based on available information. Analyse revenue stability, solvency, profitability, going concern risk, auditor concerns, and dormancy indicators.

FINANCIAL SIGNAL TAXONOMY (propose ONLY these codes):
F00: Accounts show deteriorating turnover (MEDIUM)
F01: Accounts show net liabilities (MEDIUM)
F02: Going concern note in accounts (MEDIUM)
F03: Auditor qualification in accounts (MEDIUM)
F04: Dormant status despite active trading indicators (MEDIUM)

RULES:
1. Only propose signals F00–F04. Do not invent other codes.
2. evidenceBasis must be "known" (training data about this company), "inferred" (typical for this industry/type), or "user_provided" (from provided financials).
3. Propose a signal only where there is genuine, substantiated reason — not just because it is theoretically possible.
4. If user-provided financials are available, analyse them critically (e.g. negative net profit → F01, profit declining year-on-year → F00).
5. Articulate concrete mitigating factors where they exist.

Return ONLY valid JSON — no markdown, no explanation:
{
  "signals": [{ "code": string, "rationale": string, "confidence": "low"|"medium"|"high", "evidenceBasis": "known"|"inferred"|"user_provided" }],
  "keyRisks": string[],
  "mitigatingFactors": string[],
  "overallFinancialHealth": "strong"|"adequate"|"weak"|"unknown",
  "notes": string
}`;

function buildUserMessage(input: CompanyInput, identity: IdentityProfile): string {
  const parts = [
    `COMPANY: ${input.name}`,
    `CLASSIFICATION: ${identity.businessType} | ${identity.industry} | ${identity.jurisdiction}`,
    `SIZE: ${identity.estimatedSize}`,
    `KNOWN PUBLICLY: ${identity.knownPublicly}`,
  ];
  if (input.context) parts.push(`ANALYST CONTEXT: ${input.context}`);
  if (input.financials) {
    const f = input.financials;
    const fin: string[] = [];
    if (f.turnover != null) fin.push(`Turnover: £${f.turnover.toLocaleString()}`);
    if (f.netProfit != null) fin.push(`Net Profit: £${f.netProfit.toLocaleString()}`);
    if (f.employees != null) fin.push(`Employees: ${f.employees}`);
    if (f.incorporationYear) fin.push(`Incorporated: ${f.incorporationYear}`);
    if (fin.length) parts.push(`FINANCIAL DATA: ${fin.join(" | ")}`);
  }
  if (identity.inherentRiskFactors.length) {
    parts.push(`INHERENT RISK FACTORS: ${identity.inherentRiskFactors.join("; ")}`);
  }
  return parts.join("\n");
}

const VALID_CODES = new Set(["F00", "F01", "F02", "F03", "F04"]);
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

export async function runFinancialAgent(
  input: CompanyInput,
  identity: IdentityProfile,
): Promise<FinancialRiskAssessment> {
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
  const validHealth = ["strong", "adequate", "weak", "unknown"] as const;
  return {
    signals: sanitizeSignals(raw.signals),
    keyRisks: Array.isArray(raw.keyRisks) ? raw.keyRisks.map(String).slice(0, 6) : [],
    mitigatingFactors: Array.isArray(raw.mitigatingFactors) ? raw.mitigatingFactors.map(String).slice(0, 4) : [],
    overallFinancialHealth: validHealth.find(h => h === raw.overallFinancialHealth) ?? "unknown",
    notes: String(raw.notes ?? ""),
  };
}
