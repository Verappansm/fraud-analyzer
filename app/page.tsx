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
import SignalDashboard from "@/components/SignalDashboard";
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
    if (done) break;

    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
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
      } catch (e) {
        console.error("Failed to parse stream line:", trimmed, e);
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
      .catch(() => setHistory([]));
  }, []);

  async function runAnalysis() {
    if (!company.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusLog(["Establishing encrypted intelligence bridge..."]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), stream: true }),
      });

      if (!response.ok) {
        const maybeJson = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(maybeJson?.error ?? "Authentication or connection failure.");
      }

      const parsed = await parseNdjsonStream(response, (message) => {
        setStatusLog((prev) => [...prev, message]);
      });

      setResult(parsed);

      const historyRes = await fetch("/api/analyze");
      const historyPayload = (await historyRes.json()) as { history?: HistoryItem[] };
      setHistory(Array.isArray(historyPayload.history) ? historyPayload.history : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Critical systems failure.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-10 px-6 py-16 lg:px-12">
      <header className="flex flex-col items-start gap-2 border-l-2 border-cyan-500/30 pl-8 mb-4">
        <div className="inline-flex items-center gap-3 rounded-full bg-cyan-500/5 px-4 py-1 border border-cyan-500/10 mb-4">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/80">AmEx Intelligence Node v2.5</p>
        </div>
        <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl">
          Risk <span className="italic text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-blue-400 to-indigo-500">Forensics</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-400 leading-relaxed font-medium">
          Automated multi-signal intelligence (L00-F04) for high-exposure UK small business underwriting.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-8">
          <SearchBar value={company} onChange={setCompany} onSubmit={runAnalysis} isLoading={isLoading} />

          {isLoading && (
            <div className="flex flex-col items-center gap-6 py-12">
              <LoadingSpinner />
              <div className="flex flex-col gap-2 text-center">
                {statusLog.slice(-1).map((entry, idx) => (
                  <p key={idx} className="text-sm font-bold text-slate-300 animate-pulse uppercase tracking-[0.2em]">
                    {entry}
                  </p>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
              <p className="text-sm font-bold text-rose-400 uppercase tracking-widest mb-1">System Error</p>
              <p className="text-sm text-rose-200">{error}</p>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-1000">
              <div className="grid gap-8 md:grid-cols-2">
                <RiskScoreCard score={result.riskScore} />
                <AnalysisCard result={result} />
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <NewsCard news={result.news} />
                <SentimentChart news={result.news} />
              </div>

              <SignalDashboard signals={result.signals} />

              <WhyScoreSection whyScore={result.whyScore} />

              <footer className="glass-card rounded-3xl p-6 flex flex-wrap items-center justify-between gap-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Audit Metadata</p>
                  <p className="text-xs text-slate-300">
                    ID: {Math.random().toString(36).substr(2, 9).toUpperCase()} • 
                    {result.cached ? " CACHE HIT" : " RE-VALIDATED"} • 
                    INGESTED: {new Date(result.analyzedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-2xl bg-white px-8 py-3 text-xs font-black text-slate-900 transition-all hover:bg-cyan-400 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  GENERATE PDF AUDIT
                </button>
              </footer>
            </div>
          )}
        </div>

        <HistoryPanel history={history} />
      </div>
    </main>
  );
}
