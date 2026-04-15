import type { FilingItem } from "@/types";

interface CompanyTickerItem {
  cik_str: number;
  ticker: string;
  title: string;
}

let tickerCache: CompanyTickerItem[] | null = null;

function secHeaders(): HeadersInit {
  const ua = process.env.SEC_USER_AGENT || "FraudAnalyzer/1.0 contact@example.com";
  return {
    "User-Agent": ua,
    "Accept-Encoding": "gzip, deflate",
  };
}

async function loadTickers(): Promise<CompanyTickerItem[]> {
  if (tickerCache) {
    return tickerCache;
  }

  const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
    headers: secHeaders(),
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) {
    return [];
  }

  const payload = (await res.json()) as Record<string, CompanyTickerItem>;
  tickerCache = Object.values(payload);
  return tickerCache;
}

export async function resolveTickerFromSec(companyName: string): Promise<{
  ticker: string | null;
  cik: string | null;
}> {
  const companies = await loadTickers();
  if (companies.length === 0) {
    return { ticker: null, cik: null };
  }

  const needle = companyName.toLowerCase();

  const exact = companies.find((c) => c.title.toLowerCase() === needle);
  const partial = companies.find((c) => c.title.toLowerCase().includes(needle));
  const word = companies.find((c) => needle.includes(c.title.toLowerCase()));

  const match = exact ?? partial ?? word ?? null;

  if (!match) {
    return { ticker: null, cik: null };
  }

  return {
    ticker: match.ticker,
    cik: String(match.cik_str).padStart(10, "0"),
  };
}

export async function fetchRecentFilings(cik: string | null): Promise<FilingItem[]> {
  if (!cik) {
    return [];
  }

  const res = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
    headers: secHeaders(),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as {
    filings?: {
      recent?: {
        form?: string[];
        filingDate?: string[];
        accessionNumber?: string[];
        primaryDocument?: string[];
        primaryDocDescription?: string[];
      };
    };
  };

  const recent = data.filings?.recent;
  if (!recent?.form || !recent.filingDate || !recent.accessionNumber || !recent.primaryDocument) {
    return [];
  }

  const count = Math.min(12, recent.form.length);
  const cikNoLeading = String(Number(cik));

  const rows: FilingItem[] = [];

  for (let i = 0; i < count; i += 1) {
    const accession = recent.accessionNumber[i];
    const accessionCompact = accession?.replace(/-/g, "");
    const primaryDoc = recent.primaryDocument[i];

    if (!accession || !accessionCompact || !primaryDoc) {
      continue;
    }

    rows.push({
      type: recent.form[i] ?? "Unknown",
      date: recent.filingDate[i] ?? new Date().toISOString(),
      description: recent.primaryDocDescription?.[i] ?? "SEC filing",
      url: `https://www.sec.gov/Archives/edgar/data/${cikNoLeading}/${accessionCompact}/${primaryDoc}`,
    });
  }

  return rows;
}
