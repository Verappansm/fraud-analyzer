"use client";

import type { AnalyzeResponse } from "@/types";

interface AnalysisCardProps {
  result: AnalyzeResponse;
}

function confidenceStyles(confidence: AnalyzeResponse["confidence"]): string {
  if (confidence === "high") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (confidence === "medium") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-slate-400/10 text-slate-400 border-slate-400/20";
}

function recommendationStyles(rec: AnalyzeResponse["recommendation"]): string {
  if (rec === "high risk") return "bg-rose-500 text-white";
  if (rec === "monitor") return "bg-amber-500 text-black";
  return "bg-cyan-500 text-black";
}

export default function AnalysisCard({ result }: AnalysisCardProps) {
  return (
    <article className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-700 rounded-3xl p-6 transition-all hover:shadow-2xl hover:shadow-cyan-500/10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Deep Reasoning Analysis</h2>
        <div className="flex gap-2">
          <span className={`rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${confidenceStyles(result.confidence)}`}>
            {result.confidence} CONFIDENCE
          </span>
          <span className={`rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${recommendationStyles(result.recommendation)}`}>
            {result.recommendation}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-cyan-400">Core Findings</h3>
          <ul className="space-y-3">
            {result.analysis.map((bullet, idx) => (
              <li key={idx} className="flex gap-3 text-sm leading-relaxed text-slate-200">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        {(result.fraudSignals.length > 0 || result.legalRisks.length > 0) && (
          <div className="grid gap-6 border-t border-white/5 pt-6 sm:grid-cols-2">
            {result.fraudSignals.length > 0 && (
              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-rose-400">Fraud Signals</h3>
                <ul className="space-y-2">
                  {result.fraudSignals.map((signal, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-slate-400">
                      <span className="text-rose-400 font-bold">!</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.legalRisks.length > 0 && (
              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-amber-400">Legal Risks</h3>
                <ul className="space-y-2">
                  {result.legalRisks.map((risk, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-slate-400">
                      <span className="text-amber-400 font-bold">§</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
