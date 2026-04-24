"use client";

import { SIGNAL_TAXONOMY, type SignalCode } from "@/lib/taxonomy";
import type { DetectedSignal } from "@/types";

interface SignalDashboardProps {
  signals: DetectedSignal[];
}

export default function SignalDashboard({ signals }: SignalDashboardProps) {
  const categories = ["LEGAL", "REGULATORY", "REPUTATIONAL", "GOVERNANCE", "FINANCIAL"] as const;

  return (
    <div className="glass-card rounded-3xl p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">Risk Signal Matrix</h2>
          <p className="mt-1 text-2xl font-bold text-white">Taxonomy Classification</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-white">{signals.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Flags</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => {
          const catSignals = signals.filter((s) => SIGNAL_TAXONOMY[s.code]?.category === cat);
          
          return (
            <div key={cat} className="rounded-2xl bg-white/5 p-5 border border-white/5 transition-all hover:bg-white/10">
              <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{cat}</h3>
              
              {catSignals.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {catSignals.map((sig, idx) => (
                    <div key={idx} className="flex flex-col gap-1 border-l-2 border-cyan-500/50 pl-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-cyan-400">{sig.code}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                          sig.severity === "CRITICAL" ? "bg-rose-500 text-white" :
                          sig.severity === "HIGH" ? "bg-amber-500 text-black" :
                          "bg-slate-700 text-slate-300"
                        }`}>
                          {sig.severity}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-200">{SIGNAL_TAXONOMY[sig.code]?.label || sig.code}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{sig.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] italic text-slate-600">No signals detected in this category.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
