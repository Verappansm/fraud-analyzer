import type { HistoryItem } from "@/types";

interface HistoryPanelProps {
  history: HistoryItem[];
}

export default function HistoryPanel({ history }: HistoryPanelProps) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent Queries</h2>
      <div className="mt-4 space-y-3">
        {history.length === 0 && <p className="text-sm text-slate-500">No previous analyses yet.</p>}
        {history.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">{item.company}</p>
            <p className="mt-1 text-xs text-slate-600">
              Score {item.riskScore} • {item.confidence} confidence • {item.recommendation}
            </p>
            <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
