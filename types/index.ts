import { Severity, SignalCode } from "@/lib/taxonomy";

export type SentimentTag = "positive" | "neutral" | "negative";


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
  ticker: string;
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
  signals: DetectedSignal[];
  vectorRow: Record<SignalCode, number>;
}

export interface DetectedSignal {
  code: SignalCode;
  severity: Severity;
  source: string;
  detail: string;
  date: string;
  confidence: "low" | "medium" | "high";
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
}


export interface HistoryItem {
  id: string;
  company: string;
  riskScore: number;
  confidence: "low" | "medium" | "high";
  recommendation: "low risk" | "monitor" | "high risk";
  createdAt: string;
}
