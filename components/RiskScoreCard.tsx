interface RiskScoreCardProps {
  score: number;
}

function scoreColor(score: number): string {
  if (score >= 70) {
    return "#dc2626";
  }
  if (score >= 40) {
    return "#f59e0b";
  }
  return "#0f766e";
}

export default function RiskScoreCard({ score }: RiskScoreCardProps) {
  const color = scoreColor(score);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Risk Score</h2>
      <div className="mt-4 flex items-center gap-5">
        <div
          className="grid h-28 w-28 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${score}%, #e2e8f0 0)`,
          }}
        >
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-bold text-slate-900">
            {score}
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-500">Quantitative score between 0 and 100</p>
          <p className="mt-2 text-sm font-semibold" style={{ color }}>
            {score >= 70 ? "Elevated Risk" : score >= 40 ? "Moderate Risk" : "Lower Risk"}
          </p>
        </div>
      </div>
    </article>
  );
}
