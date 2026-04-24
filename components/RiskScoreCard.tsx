"use client";

interface RiskScoreCardProps {
  score: number;
}

function scoreColor(score: number): string {
  if (score >= 70) return "#ef4444"; // rose-500
  if (score >= 40) return "#f59e0b"; // amber-500
  return "#22d3ee"; // cyan-400
}

function scoreText(score: number): string {
  if (score >= 70) return "Elevated Exposure";
  if (score >= 40) return "Moderate Exposure";
  return "Controlled Exposure";
}

export default function RiskScoreCard({ score }: RiskScoreCardProps) {
  const color = scoreColor(score);

  return (
    <article className="glass-card animate-float overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Risk Assessment Index</h2>
        <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: color }}></span>
      </div>
      
      <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row sm:justify-start">
        <div
          className="relative grid h-32 w-32 place-items-center rounded-full p-1 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
          style={{
            background: `conic-gradient(${color} ${score}%, transparent 0)`,
          }}
        >
          <div className="grid h-[120px] w-[120px] place-items-center rounded-full bg-slate-900/90 text-4xl font-black text-white backdrop-blur-sm">
            {score}
          </div>
          <div className="absolute inset-0 -z-10 rounded-full blur-xl transition-all duration-500" 
               style={{ backgroundColor: `${color}20` }}></div>
        </div>
        
        <div className="text-center sm:text-left">
          <p className="text-2xl font-bold tracking-tight text-white">{scoreText(score)}</p>
          <p className="mt-1 text-sm text-slate-400">Quantitative risk factor based on real-time ingestion.</p>
          <div className="mt-4 flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <span>Enterprise Verified Model</span>
          </div>
        </div>
      </div>
    </article>
  );
}
