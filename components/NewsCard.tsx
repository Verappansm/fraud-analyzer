import type { NormalizedArticle } from "@/types";

interface NewsCardProps {
  news: NormalizedArticle[];
}

function tagColor(tag: NormalizedArticle["sentiment"]): string {
  if (tag === "positive") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (tag === "negative") {
    return "bg-rose-100 text-rose-800";
  }
  return "bg-slate-100 text-slate-700";
}

export default function NewsCard({ news }: NewsCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">News Articles</h2>
      <div className="mt-4 space-y-3">
        {news.length === 0 && <p className="text-sm text-slate-500">No recent articles found.</p>}

        {news.map((item) => (
          <div key={`${item.url}-${item.date}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-slate-900 hover:text-cyan-700"
              >
                {item.title}
              </a>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tagColor(item.sentiment)}`}>
                {item.sentiment}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {item.source} • {new Date(item.date).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}
