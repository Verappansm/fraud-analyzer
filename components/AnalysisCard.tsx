import type { AnalyzeResponse } from "@/types";

interface AnalysisCardProps {
  result: AnalyzeResponse;
}

function confidenceClass(confidence: AnalyzeResponse["confidence"]): string {
  if (confidence === "high") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (confidence === "medium") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-200 text-slate-700";
}

export default function AnalysisCard({ result }: AnalysisCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI Analysis</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${confidenceClass(result.confidence)}`}>
          {result.confidence} confidence
        </span>
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
          {result.recommendation}
        </span>
      </div>

      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {result.analysis.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      {result.fraudSignals.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fraud Signals</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {result.fraudSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </section>
      )}

      {result.legalRisks.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legal Risks</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {result.legalRisks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
