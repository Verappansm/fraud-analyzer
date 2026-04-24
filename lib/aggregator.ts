import { createHash } from "node:crypto";
import { scoreArticleSentiment } from "@/lib/sentimentScorer";
import { SIGNAL_TAXONOMY, type SignalCode } from "@/lib/taxonomy";
import type { DetectedSignal, FilingItem, NormalizedArticle, RawArticle } from "@/types";

const RISK_KEYWORDS = [
  "fraud",
  "lawsuit",
  "penalty",
  "investigation",
  "probe",
  "sec",
  "regulator",
  "compliance",
  "misstatement",
  "restatement",
  "class action",
  "fine",
];

function titleHash(title: string): string {
  const normalized = title.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha1").update(normalized).digest("hex");
}

function relevanceScore(title: string, summary: string): number {
  const haystack = `${title} ${summary}`.toLowerCase();
  const base = RISK_KEYWORDS.reduce(
    (score, keyword) => score + (haystack.includes(keyword) ? 2 : 0),
    0,
  );

  const lengthPenalty = Math.min(Math.floor(haystack.length / 180), 3);
  return Math.max(base - lengthPenalty, 0);
}

export function normalizeArticles(articles: RawArticle[]): NormalizedArticle[] {
  const deduped = new Map<string, NormalizedArticle>();

  for (const item of articles) {
    const title = (item.title ?? "").trim();
    const url = (item.url ?? "").trim();

    if (!title || !url) {
      continue;
    }

    const summary = (item.summary ?? "").trim();
    const source = (item.source ?? "Unknown").trim();
    const parsedDate = item.date ? new Date(item.date) : null;
    const date = parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString();

    const sentiment = scoreArticleSentiment({ title, summary });
    const normalized: NormalizedArticle = {
      title,
      source,
      date,
      summary,
      url,
      sentiment: sentiment.tag,
      sentimentScore: sentiment.score,
      relevanceScore: relevanceScore(title, summary),
    };

    const key = titleHash(title);
    const previous = deduped.get(key);
    if (!previous || normalized.date > previous.date) {
      deduped.set(key, normalized);
    }
  }

  return [...deduped.values()].sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return b.date.localeCompare(a.date);
  });
}

export function normalizeFilings(filings: FilingItem[]): FilingItem[] {
  return filings
    .filter((f) => f.type && f.date && f.url)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
}

export function mapToSignals(
  news: NormalizedArticle[],
  companiesHouse: any,
  directorAnalysis: any,
): { signals: DetectedSignal[]; vectorRow: Record<SignalCode, number> } {
  const signals: DetectedSignal[] = [];
  const vectorRow: any = {};

  // Initialize vector with 0s
  Object.keys(SIGNAL_TAXONOMY).forEach((code) => {
    vectorRow[code] = 0;
  });

  // 1. Companies House Profile Signals
  if (companiesHouse) {
    const status = companiesHouse.company_status;
    if (status === "liquidation") { addSignal("L01", "Companies House", "Company is in liquidation"); }
    if (status === "administration") { addSignal("L02", "Companies House", "Company is in administration"); }
    if (status === "dissolved") { addSignal("L03", "Companies House", "Company is dissolved"); }
    
    // Check for overdue filings
    if (companiesHouse.accounts?.overdue) { addSignal("G03", "Companies House", "Accounts filing is overdue"); }
    if (companiesHouse.confirmation_statement?.overdue) { addSignal("G04", "Companies House", "Confirmation statement is overdue"); }
  }

  // 2. Director Analysis Signals
  if (directorAnalysis) {
    if (directorAnalysis.serialFailures) {
      addSignal("G01", "Companies House", "Director linked to 4+ failed companies");
    } else if (directorAnalysis.failedCompaniesCount >= 2) {
      addSignal("G00", "Companies House", `Director linked to ${directorAnalysis.failedCompaniesCount} failed companies`);
    }
  }

  // 3. News Signals (Heuristic mapping)
  news.forEach((article) => {
    const text = (article.title + " " + article.summary).toLowerCase();
    if (text.includes("fraud") || text.includes("scam")) {
      addSignal("P00", article.source, "Fraud allegation detected in news");
    }
    if (text.includes("hmrc") && text.includes("investigation")) {
      addSignal("P01", article.source, "HMRC investigation mentioned in news");
    }
    if (text.includes("winding-up") || text.includes("petition")) {
      addSignal("L00", article.source, "Winding-up petition mentioned in news");
    }
    if (text.includes("ccj") || text.includes("judgment")) {
      addSignal("L07", article.source, "Potential CCJ or judgment mentioned in news");
    }
  });

  function addSignal(code: SignalCode, source: string, detail: string) {
    if (vectorRow[code] === 1) return; // Dedupe
    vectorRow[code] = 1;
    const def = SIGNAL_TAXONOMY[code];
    signals.push({
      code,
      severity: def.severity,
      source,
      detail,
      date: new Date().toISOString().split("T")[0],
      confidence: "medium",
    });
  }

  return { signals, vectorRow };
}

