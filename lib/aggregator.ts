import { createHash } from "node:crypto";
import { scoreArticleSentiment } from "@/lib/sentimentScorer";
import type { NormalizedArticle, RawArticle } from "@/types";

const RISK_KEYWORDS = [
  "fraud", "lawsuit", "penalty", "investigation", "probe",
  "regulator", "compliance", "misstatement", "restatement",
  "class action", "fine", "insolvency", "liquidation",
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

    if (!title) continue;

    const summary = (item.summary ?? "").trim();
    const source = (item.source ?? "Unknown").trim();
    const parsedDate = item.date ? new Date(item.date) : null;
    const date =
      parsedDate && !Number.isNaN(parsedDate.getTime())
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
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    return b.date.localeCompare(a.date);
  });
}
