"use client";

import type { HistoryItem } from "@/types";

interface HistoryPanelProps {
  history: HistoryItem[];
}

export default function HistoryPanel({ history }: HistoryPanelProps) {
  return (
    <aside className="glass-card flex h-fit flex-col rounded-3xl p-8 sticky top-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">Audit Trail</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Live Feed</p>
        </div>
        <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#22d3ee]"></div>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center opacity-50">
            <div className="h-px w-8 bg-slate-700"></div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Zero active logs</p>
            <div className="h-px w-8 bg-slate-700"></div>
          </div>
        ) : (
          history.map((item) => (
            <div 
              key={item.id} 
              className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:bg-white/[0.08] hover:translate-x-1"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-black text-white group-hover:text-cyan-400 transition-colors">{item.company}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                      item.riskScore >= 70 ? 'bg-rose-500/20 text-rose-400' : 
                      item.riskScore >= 40 ? 'bg-amber-500/20 text-amber-400' : 
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {item.recommendation}
                    </span>
                    <span className="text-[9px] font-bold text-slate-600">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black leading-none ${
                    item.riskScore >= 70 ? 'text-rose-500' : 
                    item.riskScore >= 40 ? 'text-amber-500' : 
                    'text-cyan-400'
                  }`}>
                    {item.riskScore}
                  </p>
                  <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">Score</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {history.length > 0 && (
        <a 
          href="/api/export/csv" 
          className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10 active:scale-95"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Intelligence Dataset
        </a>
      )}
    </aside>
  );
}
