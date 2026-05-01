"use client";

import { useState } from "react";
import type { UserFinancials } from "@/types";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  context: string;
  onContextChange: (v: string) => void;
  financials: UserFinancials;
  onFinancialsChange: (f: UserFinancials) => void;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  isLoading,
  context,
  onContextChange,
  financials,
  onFinancialsChange,
}: SearchBarProps) {
  const [expanded, setExpanded] = useState(false);

  function updateFinancial(key: keyof UserFinancials, raw: string) {
    const numericKeys: (keyof UserFinancials)[] = ["turnover", "netProfit", "employees", "incorporationYear"];
    if (numericKeys.includes(key)) {
      const n = raw === "" ? undefined : Number(raw);
      onFinancialsChange({ ...financials, [key]: Number.isFinite(n) ? n : undefined });
    } else {
      onFinancialsChange({ ...financials, [key]: raw || undefined });
    }
  }

  const hasContext = Boolean(context.trim());
  const hasFinancials = Object.values(financials).some(v => v !== undefined && v !== "");
  const contextIndicator = hasContext || hasFinancials;

  return (
    <section className="glass-card rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 hover:shadow-cyan-500/10 overflow-hidden">
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-500/50">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="company"
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onSubmit()}
              placeholder="Enter Business Name or Identifier..."
              className="h-16 w-full rounded-2xl bg-white/5 pl-14 pr-6 text-xl font-medium text-white placeholder-slate-500 focus:bg-white/10 focus:outline-none transition-all border border-transparent focus:border-cyan-500/30"
              disabled={isLoading}
            />
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || !value.trim()}
            className="relative h-16 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-12 text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-95 disabled:grayscale disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Scanning</span>
              </div>
            ) : (
              "Initiate Probe"
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          disabled={isLoading}
          className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-40"
        >
          <span className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}>▶</span>
          {expanded ? "Hide" : "Add"} Intelligence Context
          {contextIndicator && !expanded && (
            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[8px] font-black text-white">✓</span>
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-6 pb-6 pt-5 flex flex-col gap-5 animate-in fade-in duration-300">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
              Analyst Context & Intelligence
            </label>
            <textarea
              value={context}
              onChange={e => onContextChange(e.target.value)}
              placeholder="Add known concerns, news clippings, underwriter notes, prior decisions, or any intelligence relevant to this account..."
              rows={4}
              className="w-full rounded-2xl bg-white/5 px-5 py-4 text-sm text-white placeholder-slate-600 focus:bg-white/8 focus:outline-none transition-all border border-white/5 focus:border-cyan-500/20 resize-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
              Financial Indicators <span className="text-slate-600 normal-case font-normal">(optional)</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-600">Annual Turnover (£)</label>
                <input
                  type="number"
                  placeholder="e.g. 2500000"
                  value={financials.turnover ?? ""}
                  onChange={e => updateFinancial("turnover", e.target.value)}
                  className="h-11 w-full rounded-xl bg-white/5 px-4 text-sm text-white placeholder-slate-600 focus:bg-white/8 focus:outline-none border border-white/5 focus:border-cyan-500/20 transition-all"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-600">Net Profit (£)</label>
                <input
                  type="number"
                  placeholder="e.g. 180000"
                  value={financials.netProfit ?? ""}
                  onChange={e => updateFinancial("netProfit", e.target.value)}
                  className="h-11 w-full rounded-xl bg-white/5 px-4 text-sm text-white placeholder-slate-600 focus:bg-white/8 focus:outline-none border border-white/5 focus:border-cyan-500/20 transition-all"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-600">Employees</label>
                <input
                  type="number"
                  placeholder="e.g. 45"
                  value={financials.employees ?? ""}
                  onChange={e => updateFinancial("employees", e.target.value)}
                  className="h-11 w-full rounded-xl bg-white/5 px-4 text-sm text-white placeholder-slate-600 focus:bg-white/8 focus:outline-none border border-white/5 focus:border-cyan-500/20 transition-all"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-600">Year Founded</label>
                <input
                  type="number"
                  placeholder="e.g. 2012"
                  value={financials.incorporationYear ?? ""}
                  onChange={e => updateFinancial("incorporationYear", e.target.value)}
                  className="h-11 w-full rounded-xl bg-white/5 px-4 text-sm text-white placeholder-slate-600 focus:bg-white/8 focus:outline-none border border-white/5 focus:border-cyan-500/20 transition-all"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-600">Industry</label>
                <input
                  type="text"
                  placeholder="e.g. Construction"
                  value={financials.industry ?? ""}
                  onChange={e => updateFinancial("industry", e.target.value)}
                  className="h-11 w-full rounded-xl bg-white/5 px-4 text-sm text-white placeholder-slate-600 focus:bg-white/8 focus:outline-none border border-white/5 focus:border-cyan-500/20 transition-all"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-600">Country</label>
                <input
                  type="text"
                  placeholder="e.g. United Kingdom"
                  value={financials.country ?? ""}
                  onChange={e => updateFinancial("country", e.target.value)}
                  className="h-11 w-full rounded-xl bg-white/5 px-4 text-sm text-white placeholder-slate-600 focus:bg-white/8 focus:outline-none border border-white/5 focus:border-cyan-500/20 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-600">Business Description</label>
              <input
                type="text"
                placeholder="Brief description of business activities..."
                value={financials.description ?? ""}
                onChange={e => updateFinancial("description", e.target.value)}
                className="h-11 w-full rounded-xl bg-white/5 px-4 text-sm text-white placeholder-slate-600 focus:bg-white/8 focus:outline-none border border-white/5 focus:border-cyan-500/20 transition-all"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
