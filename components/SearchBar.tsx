"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export default function SearchBar({ value, onChange, onSubmit, isLoading }: SearchBarProps) {
  return (
    <section className="glass-card rounded-[2rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 hover:shadow-cyan-500/10">
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
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder="Enter UK Business Name or CRN..."
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
    </section>
  );
}
