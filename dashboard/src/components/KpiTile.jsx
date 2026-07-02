import { useCountUp } from "../hooks/useCountUp";

export default function KpiTile({ label, numericValue, format, foot, growth, delay = 0 }) {
  const display = useCountUp(typeof numericValue === "number" ? numericValue : "—", {
    format: format || ((n) => n),
  });
  const hasGrowth = typeof growth === "number" && !Number.isNaN(growth);
  const isUp = hasGrowth && growth >= 0;

  return (
    <div
      className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        {hasGrowth && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
              {isUp ? (
                <path d="M6 9V3M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M6 3v6M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
            {Math.abs(growth * 100).toFixed(1)}%
          </span>
        )}
      </div>
      <div className={`font-display mt-2 text-2xl font-extrabold tracking-tight ${display === "—" ? "text-slate-300" : "text-slate-800"}`}>
        {display}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{foot || " "}</div>
    </div>
  );
}
