import { XMLParser } from "fast-xml-parser";
import type { RawArticle } from "@/types";

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

async function parseRss(url: string): Promise<RawArticle[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "FraudAnalyzer/1.0",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Google News RSS failed: ${res.status}`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml);
  const items = toArray(parsed?.rss?.channel?.item);

  return items.map((item: Record<string, unknown>) => {
    const source = typeof item.source === "object"
      ? String((item.source as Record<string, unknown>)["#text"] ?? "Google News")
      : String(item.source ?? "Google News");

    return {
      title: String(item.title ?? ""),
      summary: String(item.description ?? ""),
      source,
      url: String(item.link ?? ""),
      date: String(item.pubDate ?? ""),
    };
  });
}

async function scrapeFallback(company: string): Promise<RawArticle[]> {
  const q = encodeURIComponent(`${company} fraud OR lawsuit OR SEC`);
  const url = `https://news.google.com/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 FraudAnalyzer/1.0",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return [];
  }

  const html = await res.text();
  const matches = [...html.matchAll(/<a[^>]*href="(\.\/articles\/[^"?#]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)];

  return matches.slice(0, 15).map((m) => {
    const rel = m[1]?.trim() ?? "";
    const text = m[2]?.replace(/<[^>]*>/g, "").trim() ?? "";
    return {
      title: text,
      summary: "",
      source: "Google News",
      url: rel ? `https://news.google.com/${rel.replace(/^\.\//, "")}` : "",
      date: new Date().toISOString(),
    };
  });
}

export async function fetchGoogleNews(company: string): Promise<RawArticle[]> {
  const query = encodeURIComponent(`${company} when:30d`);
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const items = await parseRss(rssUrl);
    if (items.length > 0) {
      return items;
    }
  } catch {
    // Intentionally swallow to trigger fallback scraping.
  }

  return scrapeFallback(company);
}
