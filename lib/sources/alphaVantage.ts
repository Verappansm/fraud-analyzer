import type { FinancialSnapshot } from "@/types";

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function fetchAlphaVantageOverview(
  ticker: string | null,
): Promise<FinancialSnapshot | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey || !ticker) {
    return null;
  }

  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(
    ticker,
  )}&apikey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as Record<string, unknown>;
  if (!data.Symbol) {
    return null;
  }

  return {
    ticker: String(data.Symbol),
    marketCap: toNumber(data.MarketCapitalization),
    pe: toNumber(data.PERatio),
    eps: toNumber(data.EPS),
    beta: toNumber(data.Beta),
    revenueTTM: toNumber(data.RevenueTTM),
    profitMargin: toNumber(data.ProfitMargin),
    operatingMarginTTM: toNumber(data.OperatingMarginTTM),
    returnOnAssetsTTM: toNumber(data.ReturnOnAssetsTTM),
    returnOnEquityTTM: toNumber(data.ReturnOnEquityTTM),
    analystTargetPrice: toNumber(data.AnalystTargetPrice),
    week52High: toNumber(data["52WeekHigh"]),
    week52Low: toNumber(data["52WeekLow"]),
  };
}
