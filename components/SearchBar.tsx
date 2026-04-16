interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export default function SearchBar({ value, onChange, onSubmit, isLoading }: SearchBarProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-lg backdrop-blur sm:p-6">
      <label htmlFor="company" className="mb-2 block text-sm font-semibold text-slate-700">
        Company Name
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="company"
          suppressHydrationWarning
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSubmit();
            }
          }}
          placeholder="Tesla, Apple, Enron..."
          className="h-12 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
          className="h-12 rounded-xl bg-cyan-700 px-6 font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading ? "Analyzing..." : "Analyze"}
        </button>
      </div>
    </section>
  );
}
