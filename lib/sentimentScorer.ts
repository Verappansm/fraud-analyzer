import type { NormalizedArticle, SentimentBreakdown, SentimentTag } from "@/types";

const POSITIVE_TERMS = [
  "growth",
  "beat",
  "upside",
  "profit",
  "settled",
  "approval",
  "strong",
  "upgrade",
];

const NEGATIVE_TERMS = [
  "fraud",
  "lawsuit",
  "penalty",
  "investigation",
  "probe",
  "default",
  "bankruptcy",
  "downgrade",
  "loss",
  "whistleblower",
  "compliance",
  "sanction",
];

export function scoreTextSentiment(text: string): number {
  const normalized = text.toLowerCase();

  const positiveHits = POSITIVE_TERMS.reduce(
    (acc, token) => acc + (normalized.includes(token) ? 1 : 0),
    0,
  );

  const negativeHits = NEGATIVE_TERMS.reduce(
    (acc, token) => acc + (normalized.includes(token) ? 1 : 0),
    0,
  );

  return positiveHits - negativeHits;
}

export function scoreArticleSentiment(article: Pick<NormalizedArticle, "title" | "summary">): {
  score: number;
  tag: SentimentTag;
} {
  const score = scoreTextSentiment(`${article.title} ${article.summary}`);

  let tag: SentimentTag = "neutral";
  if (score >= 2) {
    tag = "positive";
  } else if (score <= -2) {
    tag = "negative";
  }

  return { score, tag };
}

export function aggregateSentiment(articles: NormalizedArticle[]): SentimentBreakdown {
  const breakdown = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  for (const article of articles) {
    breakdown[article.sentiment] += 1;
  }

  let trend: SentimentBreakdown["trend"] = "neutral";
  if (breakdown.negative > breakdown.positive && breakdown.negative >= breakdown.neutral) {
    trend = "negative";
  } else if (breakdown.positive > breakdown.negative && breakdown.positive >= breakdown.neutral) {
    trend = "positive";
  }

  return {
    ...breakdown,
    trend,
  };
}
