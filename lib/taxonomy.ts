export type SignalCode =
  | "L00" | "L01" | "L02" | "L03" | "L04" | "L05" | "L06" | "L07" | "L08" | "L09" | "L10"
  | "R00" | "R01" | "R02" | "R03" | "R04" | "R05" | "R06" | "R07" | "R08" | "R09"
  | "P00" | "P01" | "P02" | "P03" | "P04" | "P05" | "P06" | "P07"
  | "G00" | "G01" | "G02" | "G03" | "G04" | "G05" | "G06"
  | "F00" | "F01" | "F02" | "F03" | "F04";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface SignalDefinition {
  code: SignalCode;
  label: string;
  severity: Severity;
  category: "LEGAL" | "REGULATORY" | "REPUTATIONAL" | "GOVERNANCE" | "FINANCIAL";
}

export const SIGNAL_TAXONOMY: Record<SignalCode, SignalDefinition> = {
  // LEGAL
  L00: { code: "L00", label: "Winding-up petition filed", severity: "CRITICAL", category: "LEGAL" },
  L01: { code: "L01", label: "Company in liquidation", severity: "CRITICAL", category: "LEGAL" },
  L02: { code: "L02", label: "Company in administration", severity: "CRITICAL", category: "LEGAL" },
  L03: { code: "L03", label: "Company dissolved", severity: "CRITICAL", category: "LEGAL" },
  L04: { code: "L04", label: "Outstanding charges registered", severity: "HIGH", category: "LEGAL" },
  L05: { code: "L05", label: "Insolvency history on record", severity: "HIGH", category: "LEGAL" },
  L06: { code: "L06", label: "Previously been liquidated", severity: "CRITICAL", category: "LEGAL" },
  L07: { code: "L07", label: "County court judgment (CCJ) detected", severity: "HIGH", category: "LEGAL" },
  L08: { code: "L08", label: "High Court judgment detected", severity: "HIGH", category: "LEGAL" },
  L09: { code: "L09", label: "Statutory demand filed", severity: "CRITICAL", category: "LEGAL" },
  L10: { code: "L10", label: "Legal filing keyword detected", severity: "MEDIUM", category: "LEGAL" },

  // REGULATORY
  R00: { code: "R00", label: "FCA enforcement action", severity: "HIGH", category: "REGULATORY" },
  R01: { code: "R01", label: "FCA warning list match", severity: "CRITICAL", category: "REGULATORY" },
  R02: { code: "R02", label: "ICO data protection enforcement", severity: "HIGH", category: "REGULATORY" },
  R03: { code: "R03", label: "CMA competition investigation", severity: "HIGH", category: "REGULATORY" },
  R04: { code: "R04", label: "HSE health and safety prosecution", severity: "HIGH", category: "REGULATORY" },
  R05: { code: "R05", label: "HMRC deliberate defaulter list", severity: "HIGH", category: "REGULATORY" },
  R06: { code: "R06", label: "HMRC tax avoidance scheme", severity: "MEDIUM", category: "REGULATORY" },
  R07: { code: "R07", label: "Environment Agency violation", severity: "MEDIUM", category: "REGULATORY" },
  R08: { code: "R08", label: "Pensions Regulator action", severity: "MEDIUM", category: "REGULATORY" },
  R09: { code: "R09", label: "Regulatory licence revoked or suspended", severity: "MEDIUM", category: "REGULATORY" },

  // REPUTATIONAL
  P00: { code: "P00", label: "Fraud allegation in news", severity: "HIGH", category: "REPUTATIONAL" },
  P01: { code: "P01", label: "HMRC investigation mentioned in news", severity: "HIGH", category: "REPUTATIONAL" },
  P02: { code: "P02", label: "Misconduct or scandal in news", severity: "MEDIUM", category: "REPUTATIONAL" },
  P03: { code: "P03", label: "Senior director departure reported", severity: "MEDIUM", category: "REPUTATIONAL" },
  P04: { code: "P04", label: "Data breach reported", severity: "MEDIUM", category: "REPUTATIONAL" },
  P05: { code: "P05", label: "Customer complaint pattern (reviews)", severity: "MEDIUM", category: "REPUTATIONAL" },
  P06: { code: "P06", label: "Negative news mention (general)", severity: "MEDIUM", category: "REPUTATIONAL" },
  P07: { code: "P07", label: "Social media reputational event", severity: "LOW", category: "REPUTATIONAL" },

  // GOVERNANCE
  G00: { code: "G00", label: "Director linked to 2-3 previously failed companies", severity: "HIGH", category: "GOVERNANCE" },
  G01: { code: "G01", label: "Director linked to 4+ previously failed companies (serial)", severity: "CRITICAL", category: "GOVERNANCE" },
  G02: { code: "G02", label: "Multiple director resignations (2+ in 12 months)", severity: "MEDIUM", category: "GOVERNANCE" },
  G03: { code: "G03", label: "Accounts filing overdue", severity: "MEDIUM", category: "GOVERNANCE" },
  G04: { code: "G04", label: "Confirmation statement overdue", severity: "MEDIUM", category: "GOVERNANCE" },
  G05: { code: "G05", label: "Registered office address in dispute", severity: "LOW", category: "GOVERNANCE" },
  G06: { code: "G06", label: "Significant ownership change detected", severity: "MEDIUM", category: "GOVERNANCE" },

  // FINANCIAL
  F00: { code: "F00", label: "Accounts show deteriorating turnover", severity: "MEDIUM", category: "FINANCIAL" },
  F01: { code: "F01", label: "Accounts show net liabilities", severity: "MEDIUM", category: "FINANCIAL" },
  F02: { code: "F02", label: "Going concern note in accounts", severity: "MEDIUM", category: "FINANCIAL" },
  F03: { code: "F03", label: "Auditor qualification in accounts", severity: "MEDIUM", category: "FINANCIAL" },
  F04: { code: "F04", label: "Dormant status despite active trading indicators", severity: "MEDIUM", category: "FINANCIAL" },
};

export function getSeverityRank(severity: Severity): number {
  switch (severity) {
    case "CRITICAL": return 4;
    case "HIGH": return 3;
    case "MEDIUM": return 2;
    case "LOW": return 1;
    default: return 0;
  }
}

export function getHighestSeverity(codes: SignalCode[]): Severity {
  let highest: Severity = "NONE";
  let highestRank = 0;

  for (const code of codes) {
    const def = SIGNAL_TAXONOMY[code];
    const rank = getSeverityRank(def.severity);
    if (rank > highestRank) {
      highestRank = rank;
      highest = def.severity;
    }
  }

  return highest;
}
