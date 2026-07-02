import { useSalesSummary } from "../hooks/queries";
import { fmtInt, fmtMoneyFull } from "../format";
import { PanelSkeleton } from "./Skeleton";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function TopMonths() {
  const { data, isLoading, error } = useSalesSummary({
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    groupBy: "month",
  });

  const rows = (data?.timeSeries || [])
    .map((d) => ({ ...d, monthIndex: Number(d.date.slice(5, 7)) - 1 }))
    .sort((a, b) => b.revenue - a.revenue);
  const max = Math.max(1, ...rows.map((r) => r.revenue));

  if (isLoading && !data) return <PanelSkeleton rows={6} />;

  return (
    <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-bold text-slate-800">Meses con más ventas — 2025</span>
        {error && (
          <span className="text-xs text-red-500" role="alert">
            Error: {error.message}
          </span>
        )}
      </div>
      <div className="mb-4 text-[11.5px] text-slate-400">Ranking de ingresos mensuales, de mayor a menor.</div>

      {!isLoading && rows.length === 0 && <div className="py-9 text-center text-xs text-slate-400">Sin datos</div>}

      {rows.length > 0 && (
        <div className="flex flex-col gap-3.5">
          {rows.map((r, i) => {
            const w = Math.max(2, Math.round((r.revenue / max) * 100));
            return (
              <div className="flex items-center gap-3.5" key={r.date}>
                <span
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold ${
                    i < 3 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold text-slate-700">{MONTH_NAMES[r.monthIndex]}</span>
                    <span className="text-xs font-bold tabular-nums text-slate-700">{fmtMoneyFull(r.revenue)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="animate-grow-h h-full rounded-full bg-indigo-600"
                      style={{ width: `${w}%`, "--bar-delay": `${i * 55}ms` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">{fmtInt(r.orders)} pedidos</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
