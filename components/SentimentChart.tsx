"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { NormalizedArticle } from "@/types";

interface SentimentChartProps {
  news: NormalizedArticle[];
}

export default function SentimentChart({ news }: SentimentChartProps) {
  const positive = news.filter((n) => n.sentiment === "positive").length;
  const neutral = news.filter((n) => n.sentiment === "neutral").length;
  const negative = news.filter((n) => n.sentiment === "negative").length;

  const data = [
    { name: "Positive", value: positive, color: "#10b981" },
    { name: "Neutral", value: neutral, color: "#94a3b8" },
    { name: "Negative", value: negative, color: "#ef4444" },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card rounded-xl border border-white/10 p-2 text-xs shadow-xl">
          <p className="font-bold text-white">{`${payload[0].name}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <article className="glass-card rounded-3xl p-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Sentiment Distribution</h2>
      <div className="mt-8 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              allowDecimals={false} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
