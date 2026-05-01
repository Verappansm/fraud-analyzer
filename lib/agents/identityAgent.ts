import { createOpenAIClient } from "./openaiClient";
import type { CompanyInput, IdentityProfile } from "./types";

const SYSTEM_PROMPT = `You are a corporate intelligence specialist supporting American Express UK underwriting.

Your task: Given a company name and optional context, classify the business and build an intelligence profile.

Distinguish clearly between:
- KNOWN: Specific facts from your training data about this exact company
- INFERRED: Reasonable inferences from industry/company type/name
- UNKNOWN: Information that cannot be determined without external data

IMPORTANT: Never fabricate specific facts (dates, numbers, events). Acknowledge uncertainty explicitly.

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "industry": string,
  "sector": string,
  "jurisdiction": string,
  "businessType": "SME" | "Corporate" | "Startup" | "Sole Trader" | "Unknown",
  "estimatedSize": string,
  "knownPublicly": boolean,
  "inherentRiskFactors": string[],
  "confidence": "low" | "medium" | "high",
  "notes": string
}`;

function buildUserMessage(input: CompanyInput): string {
  const parts = [`COMPANY: ${input.name}`];
  if (input.context) parts.push(`ANALYST CONTEXT: ${input.context}`);
  if (input.financials) {
    const f = input.financials;
    const items: string[] = [];
    if (f.industry) items.push(`Industry: ${f.industry}`);
    if (f.country) items.push(`Country: ${f.country}`);
    if (f.description) items.push(`Description: ${f.description}`);
    if (f.incorporationYear) items.push(`Founded: ${f.incorporationYear}`);
    if (f.employees) items.push(`Employees: ${f.employees}`);
    if (items.length) parts.push(`PROVIDED DETAILS: ${items.join(" | ")}`);
  }
  return parts.join("\n");
}

function sanitize(raw: Record<string, unknown>): IdentityProfile {
  const validTypes = ["SME", "Corporate", "Startup", "Sole Trader", "Unknown"] as const;
  const validConf = ["low", "medium", "high"] as const;
  return {
    industry: String(raw.industry ?? "Unknown"),
    sector: String(raw.sector ?? "Unknown"),
    jurisdiction: String(raw.jurisdiction ?? "Unknown"),
    businessType: validTypes.find(t => t === raw.businessType) ?? "Unknown",
    estimatedSize: String(raw.estimatedSize ?? "Unknown"),
    knownPublicly: Boolean(raw.knownPublicly),
    inherentRiskFactors: Array.isArray(raw.inherentRiskFactors)
      ? raw.inherentRiskFactors.map(String).slice(0, 8)
      : [],
    confidence: validConf.find(c => c === raw.confidence) ?? "low",
    notes: String(raw.notes ?? ""),
  };
}

export async function runIdentityAgent(input: CompanyInput): Promise<IdentityProfile> {
  const client = createOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(input) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  const raw = JSON.parse(response.choices[0].message.content ?? "{}") as Record<string, unknown>;
  return sanitize(raw);
}
