"use client";

export default function LoadingSpinner() {
  return (
    <div className="glass-card flex items-center gap-4 rounded-2xl px-6 py-4 animate-in fade-in zoom-in duration-300">
      <div className="relative">
        <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin" />
        <div className="absolute inset-0 h-6 w-6 rounded-full animate-pulse bg-cyan-400/10" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Deep Ingestion</span>
        <span className="text-[10px] text-slate-400">Aggregating multi-source delta...</span>
      </div>
    </div>
  );
}
