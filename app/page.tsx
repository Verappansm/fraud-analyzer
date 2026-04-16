"use client";

import { useEffect, useMemo, useState } from "react";
import AnalysisCard from "@/components/AnalysisCard";
import HistoryPanel from "@/components/HistoryPanel";
import LoadingSpinner from "@/components/LoadingSpinner";
import NewsCard from "@/components/NewsCard";
import RiskScoreCard from "@/components/RiskScoreCard";
import SearchBar from "@/components/SearchBar";
import SentimentChart from "@/components/SentimentChart";
import WhyScoreSection from "@/components/WhyScoreSection";
import type { AnalyzeResponse, HistoryItem } from "@/types";

type StreamChunk =
  | { type: "status"; message?: string }
  | { type: "result"; payload: AnalyzeResponse }
  | { type: "error"; message?: string };

async function parseNdjsonStream(
  response: Response,
  onStatus: (message: string) => void,
): Promise<AnalyzeResponse> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Unable to read streaming response.");
  }

  const decoder = new TextDecoder();
  let buffered = "";
  let finalPayload: AnalyzeResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const event = JSON.parse(trimmed) as StreamChunk;
      if (event.type === "status" && event.message) {
        onStatus(event.message);
      }
      if (event.type === "error") {
        throw new Error(event.message ?? "Streaming analysis failed.");
      }
      if (event.type === "result") {
        finalPayload = event.payload;
      }
    }
  }

  if (!finalPayload) {
    throw new Error("No result payload was returned.");
  }

  return finalPayload;
}

export default function Home() {
  const [company, setCompany] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/analyze")
      .then((res) => res.json())
      .then((payload) => {
        setHistory(Array.isArray(payload.history) ? payload.history : []);
      })
      .catch(() => {
        setHistory([]);
      });
  }, []);

  const sentimentSummary = useMemo(() => {
    if (!result) {
      return "";
    }
    return `${result.news.length} articles analyzed • sentiment trend: ${result.sentimentTrend}`;
  }, [result]);

  async function runAnalysis() {
    if (!company.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatusLog(["Submitting analysis request..."]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company: company.trim(), stream: true }),
      });

      if (!response.ok) {
        const maybeJson = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(maybeJson?.error ?? "Analysis request failed.");
      }

      const parsed = await parseNdjsonStream(response, (message) => {
        setStatusLog((prev) => [...prev, message]);
      });

      setResult(parsed);

      const historyRes = await fetch("/api/analyze");
      const historyPayload = (await historyRes.json()) as { history?: HistoryItem[] };
      setHistory(Array.isArray(historyPayload.history) ? historyPayload.history : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-cyan-100 bg-linear-to-r from-cyan-800 via-sky-800 to-blue-900 p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Fraud Analyzer</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">AI Financial Risk Analysis</h1>
        <p className="mt-2 max-w-2xl text-sm text-cyan-50 sm:text-base">
          Enterprise-grade company risk scoring from real-time news, filings, and financial indicators.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <SearchBar value={company} onChange={setCompany} onSubmit={runAnalysis} isLoading={isLoading} />

          {isLoading && (
            <div className="space-y-3">
              <LoadingSpinner />
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                {statusLog.map((entry, idx) => (
                  <p key={`${entry}-${idx}`}>• {entry}</p>
                ))}
              </div>
            </div>
          )}

          {error && <p className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>}

          {result && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <RiskScoreCard score={result.riskScore} />
                <AnalysisCard result={result} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <NewsCard news={result.news} />
                <SentimentChart news={result.news} />
              </div>

              <WhyScoreSection whyScore={result.whyScore} />

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Data Quality</h2>
                <p className="mt-2 text-sm text-slate-700">
                  {sentimentSummary}
                  {result.cached ? " • served from cache" : " • fresh analysis"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Analyzed at {new Date(result.analyzedAt).toLocaleString()}</p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Export as PDF
                </button>
              </section>
            </>
          )}
        </section>

        <HistoryPanel history={history} />
      </div>
    </main>
  );
}
