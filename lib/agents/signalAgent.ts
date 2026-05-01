import { createOpenAIClient } from "./openaiClient";
import { SIGNAL_TAXONOMY, type SignalCode } from "@/lib/taxonomy";
import type {
  CompanyInput,
  IdentityProfile,
  FinancialRiskAssessment,
  GovernanceRiskAssessment,
  RegulatoryRiskAssessment,
  ReputationalRiskAssessment,
  SignalMappingResult,
  LegalSignalProposal,
} from "./types";

const LEGAL_TAXONOMY = `LEGAL SIGNAL TAXONOMY (L00–L10):
L00: Winding-up petition filed (CRITICAL)
L01: Company in liquidation (CRITICAL)
L02: Company in administration (CRITICAL)
L03: Company dissolved (CRITICAL)
L04: Outstanding charges registered (HIGH)
L05: Insolvency history on record (HIGH)
L06: Previously been liquidated (CRITICAL)
L07: County court judgment (CCJ) detected (HIGH)
L08: High Court judgment detected (HIGH)
L09: Statutory demand filed (CRITICAL)
L10: Legal filing keyword detected (MEDIUM)`;

const SYSTEM_PROMPT = `You are a legal risk intelligence specialist supporting American Express UK underwriting.

ROLE: Given a full intelligence picture of a company, identify LEGAL risk signals only (L00–L10).

These signals relate to formal legal proceedings, insolvency, and debt enforcement. They can be inferred from:
- Company status information
- News mentions of legal proceedings
- Director or company history
- Analyst context (notes, news provided)

${LEGAL_TAXONOMY}

RULES:
1. Only propose signals L00–L10. Do not duplicate signals from other categories.
2. Be conservative — legal signals require substantiated evidence.
3. L01, L02, L03, L06, L09 are CRITICAL severity — require strong evidence.
4. L10 is a catch-all for general legal filing mentions.
5. evidenceBasis: "known" = specific training data, "inferred" = cross-cutting inference, "user_provided" = from analyst context.

Return ONLY valid JSON — no markdown:
{
  "legalSignals": [{ "code": string, "rationale": string, "confidence": "low"|"medium"|"high", "evidenceBasis": "known"|"inferred"|"user_provided" }]
}`;

function buildLegalUserMessage(
  input: CompanyInput,
  identity: IdentityProfile,
  financial: FinancialRiskAssessment,
  governance: GovernanceRiskAssessment,
  reputational: ReputationalRiskAssessment,
): string {
  return [
    `COMPANY: ${input.name}`,
    `JURISDICTION: ${identity.jurisdiction}`,
    `IDENTITY NOTES: ${identity.notes}`,
    `ANALYST CONTEXT: ${input.context || "None"}`,
    `FINANCIAL FLAGS: ${financial.keyRisks.join("; ") || "None"}`,
    `GOVERNANCE FLAGS: ${governance.directorConcerns.join("; ") || "None"} | Filing: ${governance.filingCompliance}`,
    `REPUTATIONAL FLAGS: ${reputational.newsFlags.join("; ") || "None"}`,
    `CONTROVERSIES: ${reputational.knownControversies.join("; ") || "None"}`,
    `GOVERNANCE SIGNALS: ${governance.signals.map(s => `${s.code}: ${s.rationale}`).join(" | ") || "None"}`,
    `REGULATORY SIGNALS: None loaded here — handled by regulatory agent`,
  ].join("\n");
}

const VALID_LEGAL = new Set(["L00","L01","L02","L03","L04","L05","L06","L07","L08","L09","L10"]);
const VALID_CONF = ["low", "medium", "high"] as const;
const VALID_BASIS = ["known", "inferred", "user_provided"] as const;

function parseLegalProposals(raw: Record<string, unknown>): LegalSignalProposal[] {
  const arr = Array.isArray(raw.legalSignals) ? raw.legalSignals : [];
  return arr
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .filter(s => VALID_LEGAL.has(String(s.code)))
    .map(s => ({
      code: String(s.code) as SignalCode,
      rationale: String(s.rationale ?? ""),
      confidence: VALID_CONF.find(c => c === s.confidence) ?? "low",
      evidenceBasis: VALID_BASIS.find(b => b === s.evidenceBasis) ?? "inferred",
    }));
}

function categoryLabel(code: string): string {
  if (code.startsWith("L")) return "Legal Analysis";
  if (code.startsWith("R")) return "Regulatory Analysis";
  if (code.startsWith("P")) return "Reputational Analysis";
  if (code.startsWith("G")) return "Governance Analysis";
  if (code.startsWith("F")) return "Financial Analysis";
  return "Risk Analysis";
}

export async function runSignalAgent(
  input: CompanyInput,
  identity: IdentityProfile,
  financial: FinancialRiskAssessment,
  governance: GovernanceRiskAssessment,
  regulatory: RegulatoryRiskAssessment,
  reputational: ReputationalRiskAssessment,
): Promise<SignalMappingResult> {
  const client = createOpenAIClient();
  const legalResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildLegalUserMessage(input, identity, financial, governance, reputational) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  const legalRaw = JSON.parse(legalResponse.choices[0].message.content ?? "{}") as Record<string, unknown>;
  const legalProposals = parseLegalProposals(legalRaw);

  const allProposals = [
    ...financial.signals,
    ...governance.signals,
    ...regulatory.signals,
    ...reputational.signals,
    ...legalProposals,
  ];

  const seenCodes = new Set<string>();
  const today = new Date().toISOString().split("T")[0];

  const vectorRow: Record<string, number> = {};
  Object.keys(SIGNAL_TAXONOMY).forEach(code => { vectorRow[code] = 0; });

  const signals: SignalMappingResult["signals"] = [];

  for (const proposal of allProposals) {
    if (seenCodes.has(proposal.code)) continue;
    const def = SIGNAL_TAXONOMY[proposal.code as SignalCode];
    if (!def) continue;
    seenCodes.add(proposal.code);
    vectorRow[proposal.code] = 1;
    signals.push({
      code: proposal.code as SignalCode,
      severity: def.severity,
      source: categoryLabel(proposal.code),
      detail: proposal.rationale,
      date: today,
      confidence: proposal.confidence,
    });
  }

  return { signals, vectorRow };
}
