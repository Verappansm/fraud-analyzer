interface WhyScoreSectionProps {
  whyScore: string;
}

export default function WhyScoreSection({ whyScore }: WhyScoreSectionProps) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-slate-500">
        Why this score?
      </summary>
      <p className="mt-3 text-sm leading-6 text-slate-700">{whyScore}</p>
    </details>
  );
}
