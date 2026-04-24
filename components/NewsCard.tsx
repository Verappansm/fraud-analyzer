"use client";

import type { NormalizedArticle } from "@/types";

interface NewsCardProps {
  news: NormalizedArticle[];
}

function tagStyles(tag: NormalizedArticle["sentiment"]): string {
  if (tag === "positive") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (tag === "negative") return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  return "bg-slate-400/10 text-slate-400 border-slate-400/20";
}

export default function NewsCard({ news }: NewsCardProps) {
  return (
    <article className="glass-card flex flex-col rounded-3xl p-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Intelligence Feed</h2>
      <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-2" style={{ maxHeight: "400px" }}>
        {news.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-slate-500">
            <p className="text-sm">No significant data detected in last 30 days.</p>
          </div>
        )}

        {news.map((item, idx) => (
          <div 
            key={`${item.url}-${idx}`} 
            className="group rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.05] hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold leading-snug text-slate-100 transition group-hover:text-cyan-400"
              >
                {item.title}
              </a>
              <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tagStyles(item.sentiment)}`}>
                {item.sentiment}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-500">
                {item.source} • {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <div className="flex h-1.5 w-12 overflow-hidden rounded-full bg-slate-800">
                <div 
                  className="h-full bg-cyan-500" 
                  style={{ width: `${item.relevanceScore * 10}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
