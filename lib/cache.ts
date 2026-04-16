import type { AnalyzeResponse } from "@/types";

interface CacheEntry {
  expiresAt: number;
  data: AnalyzeResponse;
}

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export function getCacheKey(company: string): string {
  return company.trim().toLowerCase();
}

export function getCachedAnalysis(company: string): AnalyzeResponse | null {
  const key = getCacheKey(company);
  const hit = cache.get(key);

  if (!hit) {
    return null;
  }

  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }

  return { ...hit.data, cached: true };
}

export function setCachedAnalysis(company: string, data: AnalyzeResponse): void {
  cache.set(getCacheKey(company), {
    expiresAt: Date.now() + TTL_MS,
    data: { ...data, cached: false },
  });
}

export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt <= now) {
      cache.delete(key);
    }
  }
}
