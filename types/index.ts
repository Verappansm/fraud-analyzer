import { Severity, SignalCode } from "@/lib/taxonomy";

export type SentimentTag = "positive" | "neutral" | "negative";

export interface UserFinancials {
  turnover?: number;
  netProfit?: number;
  employees?: number;
  incorporationYear?: number;
  industry?: string;
  country?: string;
  description?: string;
}

export interface RawArticle {
  title?: string;
  source?: string;
  date?: string;
  summary?: string;
  url?: string;
}

export interface NormalizedArticle {
  title: string;
  source: string;
  date: string;
  summary: string;
  url: string;
  sentiment: SentimentTag;
  sentimentScore: number;
  relevanceScore: number;
}

export interface FinancialSnapshot {
  ticker: string | null;
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  beta: number | null;
  revenueTTM: number | null;
  profitMargin: number | null;
  operatingMarginTTM: number | null;
  returnOnAssetsTTM: number | null;
  returnOnEquityTTM: number | null;
  analystTargetPrice: number | null;
  week52High: number | null;
  week52Low: number | null;
}

export interface FilingItem {
  type: string;
  date: string;
  description: string;
  url: string;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
  trend: "positive" | "neutral" | "negative";
}

export interface LLMAnalysisOutput {
  riskScore: number;
  confidence: "low" | "medium" | "high";
  recommendation: "low risk" | "monitor" | "high risk";
  analysis: string[];
  whyScore: string;
  fraudSignals: string[];
  legalRisks: string[];
  sentimentTrend: "positive" | "neutral" | "negative";
}

export interface DetectedSignal {
  code: SignalCode;
  severity: Severity;
  source: string;
  detail: string;
  date: string;
  confidence: "low" | "medium" | "high";
}

export interface AgentTrace {
  identity: {
    industry: string;
    sector: string;
    jurisdiction: string;
    businessType: string;
    estimatedSize: string;
    knownPublicly: boolean;
    inherentRiskFactors: string[];
    confidence: "low" | "medium" | "high";
    notes: string;
  };
  financial: {
    overallFinancialHealth: string;
    keyRisks: string[];
    mitigatingFactors: string[];
    notes: string;
  };
  governance: {
    filingCompliance: string;
    directorConcerns: string[];
    structureConcerns: string[];
    notes: string;
  };
  regulatory: {
    regulatoryExposureLevel: string;
    primaryRegulators: string[];
    complianceFlags: string[];
    notes: string;
  };
  reputational: {
    publicSentiment: string;
    newsFlags: string[];
    knownControversies: string[];
    notes: string;
  };
}

export interface AnalyzeResponse {
  riskScore: number;
  confidence: "low" | "medium" | "high";
  recommendation: "low risk" | "monitor" | "high risk";
  analysis: string[];
  whyScore: string;
  fraudSignals: string[];
  legalRisks: string[];
  sentimentTrend: "positive" | "neutral" | "negative";
  sources: Array<{ title: string; url: string; date: string }>;
  news: NormalizedArticle[];
  financials: FinancialSnapshot | null;
  filings: FilingItem[];
  signals: DetectedSignal[];
  vectorRow: Record<SignalCode, number>;
  cached: boolean;
  analyzedAt: string;
  agentTrace?: AgentTrace;
}

export interface HistoryItem {
  id: string;
  company: string;
  riskScore: number;
  confidence: "low" | "medium" | "high";
  recommendation: "low risk" | "monitor" | "high risk";
  createdAt: string;
}
