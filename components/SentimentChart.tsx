"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NormalizedArticle } from "@/types";

interface SentimentChartProps {
  news: NormalizedArticle[];
}

export default function SentimentChart({ news }: SentimentChartProps) {
  const positive = news.filter((n) => n.sentiment === "positive").length;
  const neutral = news.filter((n) => n.sentiment === "neutral").length;
  const negative = news.filter((n) => n.sentiment === "negative").length;

  const data = [
    { name: "Positive", value: positive },
    { name: "Neutral", value: neutral },
    { name: "Negative", value: negative },
  ];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sentiment Graph</h2>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#0891b2" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
