import type { SignalCode, Severity } from "@/lib/taxonomy";
import type { UserFinancials } from "@/types";

export interface CompanyInput {
  name: string;
  context?: string;
  financials?: UserFinancials;
}

export interface AgentSignalProposal {
  code: SignalCode;
  rationale: string;
  confidence: "low" | "medium" | "high";
  evidenceBasis: "known" | "inferred" | "user_provided";
}

export interface IdentityProfile {
  industry: string;
  sector: string;
  jurisdiction: string;
  businessType: "SME" | "Corporate" | "Startup" | "Sole Trader" | "Unknown";
  estimatedSize: string;
  knownPublicly: boolean;
  inherentRiskFactors: string[];
  confidence: "low" | "medium" | "high";
  notes: string;
}

export interface FinancialRiskAssessment {
  signals: AgentSignalProposal[];
  keyRisks: string[];
  mitigatingFactors: string[];
  overallFinancialHealth: "strong" | "adequate" | "weak" | "unknown";
  notes: string;
}

export interface GovernanceRiskAssessment {
  signals: AgentSignalProposal[];
  directorConcerns: string[];
  structureConcerns: string[];
  filingCompliance: "compliant" | "concerns" | "overdue" | "unknown";
  notes: string;
}

export interface RegulatoryRiskAssessment {
  signals: AgentSignalProposal[];
  primaryRegulators: string[];
  complianceFlags: string[];
  regulatoryExposureLevel: "low" | "medium" | "high" | "unknown";
  notes: string;
}

export interface ReputationalRiskAssessment {
  signals: AgentSignalProposal[];
  publicSentiment: "positive" | "neutral" | "negative" | "unknown";
  newsFlags: string[];
  knownControversies: string[];
  notes: string;
}

export interface LegalSignalProposal {
  code: SignalCode;
  rationale: string;
  confidence: "low" | "medium" | "high";
  evidenceBasis: "known" | "inferred" | "user_provided";
}

export interface SignalMappingResult {
  signals: Array<{
    code: SignalCode;
    severity: Severity;
    source: string;
    detail: string;
    date: string;
    confidence: "low" | "medium" | "high";
  }>;
  vectorRow: Record<string, number>;
}

export interface SynthesisOutput {
  riskScore: number;
  confidence: "low" | "medium" | "high";
  recommendation: "low risk" | "monitor" | "high risk";
  analysis: string[];
  whyScore: string;
  fraudSignals: string[];
  legalRisks: string[];
  sentimentTrend: "positive" | "neutral" | "negative";
}
