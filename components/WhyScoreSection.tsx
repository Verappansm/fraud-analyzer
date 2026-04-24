"use client";

interface WhyScoreSectionProps {
  whyScore: string;
}

export default function WhyScoreSection({ whyScore }: WhyScoreSectionProps) {
  // Try to split by sentence
  const sentences = whyScore.match(/[^\.!\?]+[\.!\?]+/g) || [whyScore];

  return (
    <article className="glass-card rounded-3xl p-8 border-l-4 border-l-cyan-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-cyan-500/10">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">Executive Insight</h2>
      </div>
      
      <div className="space-y-4">
        {sentences.map((s, idx) => (
          <p key={idx} className={`text-lg font-medium leading-relaxed ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>
            {s.trim()}
          </p>
        ))}
      </div>
    </article>
  );
}
