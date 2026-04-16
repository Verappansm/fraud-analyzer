export type SentimentTag = "positive" | "neutral" | "negative";

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
