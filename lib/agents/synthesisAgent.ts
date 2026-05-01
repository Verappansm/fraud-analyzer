import { createOpenAIClient } from "./openaiClient";
import type {
  CompanyInput,
  IdentityProfile,
  FinancialRiskAssessment,
  GovernanceRiskAssessment,
  RegulatoryRiskAssessment,
  ReputationalRiskAssessment,
  SignalMappingResult,
  SynthesisOutput,
} from "./types";

const SYSTEM_PROMPT = `You are the Head of Credit Risk at American Express UK, making a final underwriting decision for a £100,000+ small business exposure.

You have received intelligence from five specialist agents (identity, financial, governance, regulatory, reputational) and a structured signal map. Your role is to synthesise all findings into a final risk assessment.

SCORING GUIDE:
- 0–30: Low risk — well-established business, no material concerns
- 31–55: Moderate — some flags worth monitoring, manageable risk
- 56–74: Elevated — significant concerns, enhanced due diligence required
- 75–100: High — critical signals, credit exposure not recommended without mitigation

RECOMMENDATION GUIDE:
- "low risk": Score 0–40, no critical/high signals
- "monitor": Score 41–69, or mixed signals requiring ongoing review
- "high risk": Score 70+, or any CRITICAL signal regardless of score

CONFIDENCE:
- "high": Multiple corroborated signals with known evidence basis
- "medium": Some signals but mixed evidence quality
- "low": Primarily inferred signals, limited substantiated data

WHY SCORE: Exactly 3 sentences:
1. Overall risk level and primary concern(s)
2. The single most critical signal and its specific implication for the AmEx account
3. Recommended action and rationale

Return ONLY valid JSON — no markdown, no explanation:
{
  "riskScore": number (0-100),
  "confidence": "low"|"medium"|"high",
  "recommendation": "low risk"|"monitor"|"high risk",
  "analysis": string[] (4–6 precise analyst bullets),
  "whyScore": string (EXACTLY 3 sentences),
  "fraudSignals": string[] (specific fraud indicators, empty array if none),
  "legalRisks": string[] (specific legal risks, empty array if none),
  "sentimentTrend": "positive"|"neutral"|"negative"
}`;

function buildSynthesisMessage(
  input: CompanyInput,
  identity: IdentityProfile,
  financial: FinancialRiskAssessment,
  governance: GovernanceRiskAssessment,
  regulatory: RegulatoryRiskAssessment,
  reputational: ReputationalRiskAssessment,
  signalMap: SignalMappingResult,
): string {
  const activeSignals = signalMap.signals
    .map(s => `${s.code} [${s.severity}] (${s.confidence}): ${s.detail}`)
    .join("\n");

  const parts: string[] = [
    `=== COMPANY ===`,
    `Name: ${input.name}`,
    `Industry: ${identity.industry} | Type: ${identity.businessType} | Jurisdiction: ${identity.jurisdiction}`,
    `Publicly known: ${identity.knownPublicly} | Identity confidence: ${identity.confidence}`,
    ``,
    `=== ANALYST CONTEXT ===`,
    input.context || "None provided",
    ``,
    `=== FINANCIAL ASSESSMENT ===`,
    `Overall health: ${financial.overallFinancialHealth}`,
    `Key risks: ${financial.keyRisks.join("; ") || "None identified"}`,
    `Mitigating factors: ${financial.mitigatingFactors.join("; ") || "None"}`,
    ``,
    `=== GOVERNANCE ASSESSMENT ===`,
    `Filing compliance: ${governance.filingCompliance}`,
    `Director concerns: ${governance.directorConcerns.join("; ") || "None"}`,
    `Structure concerns: ${governance.structureConcerns.join("; ") || "None"}`,
    ``,
    `=== REGULATORY ASSESSMENT ===`,
    `Exposure level: ${regulatory.regulatoryExposureLevel}`,
    `Primary regulators: ${regulatory.primaryRegulators.join(", ") || "None identified"}`,
    `Compliance flags: ${regulatory.complianceFlags.join("; ") || "None"}`,
    ``,
    `=== REPUTATIONAL ASSESSMENT ===`,
    `Public sentiment: ${reputational.publicSentiment}`,
    `News flags: ${reputational.newsFlags.join("; ") || "None"}`,
    `Known controversies: ${reputational.knownControversies.join("; ") || "None"}`,
    ``,
    `=== ACTIVE RISK SIGNALS (${signalMap.signals.length} total) ===`,
    activeSignals || "No signals detected",
  ];

  if (input.financials) {
    const f = input.financials;
    const fin: string[] = [];
    if (f.turnover != null) fin.push(`Turnover: £${f.turnover.toLocaleString()}`);
    if (f.netProfit != null) fin.push(`Net Profit: £${f.netProfit.toLocaleString()}`);
    if (f.employees != null) fin.push(`Employees: ${f.employees}`);
    if (fin.length) {
      parts.push(``, `=== PROVIDED FINANCIALS ===`, fin.join(" | "));
    }
  }

  return parts.join("\n");
}

function clampScore(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 50;
}

function normalizeEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const str = String(v ?? "").toLowerCase();
  return allowed.find(a => a === str) ?? fallback;
}

export async function runSynthesisAgent(
  input: CompanyInput,
  identity: IdentityProfile,
  financial: FinancialRiskAssessment,
  governance: GovernanceRiskAssessment,
  regulatory: RegulatoryRiskAssessment,
  reputational: ReputationalRiskAssessment,
  signalMap: SignalMappingResult,
): Promise<{ output: SynthesisOutput; rawText: string; prompt: string }> {
  const client = createOpenAIClient();
  const prompt = buildSynthesisMessage(input, identity, financial, governance, regulatory, reputational, signalMap);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const rawText = response.choices[0].message.content ?? "{}";
  const raw = JSON.parse(rawText) as Record<string, unknown>;

  const output: SynthesisOutput = {
    riskScore: clampScore(raw.riskScore),
    confidence: normalizeEnum(raw.confidence, ["low", "medium", "high"] as const, "medium"),
    recommendation: normalizeEnum(raw.recommendation, ["low risk", "monitor", "high risk"] as const, "monitor"),
    analysis: Array.isArray(raw.analysis) ? raw.analysis.map(String).slice(0, 6) : ["Analysis unavailable."],
    whyScore: String(raw.whyScore ?? "").trim(),
    fraudSignals: Array.isArray(raw.fraudSignals) ? raw.fraudSignals.map(String).slice(0, 8) : [],
    legalRisks: Array.isArray(raw.legalRisks) ? raw.legalRisks.map(String).slice(0, 8) : [],
    sentimentTrend: normalizeEnum(raw.sentimentTrend, ["positive", "neutral", "negative"] as const, "neutral"),
  };

  return { output, rawText, prompt };
}
