import { PanelSkeleton } from "./Skeleton";

export default function FulfillmentTable({ data, loading, error }) {
  const rows = data?.byRegion || [];

  if (loading && !data) return <PanelSkeleton rows={4} />;

  return (
    <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-bold text-slate-800">Fulfillment por región</span>
        {error && (
          <span className="text-xs text-red-500" role="alert">
            Error: {error}
          </span>
        )}
      </div>
      <div className="mb-4 text-[11.5px] text-slate-400">Envíos y porcentaje de entregas a tiempo por región.</div>

      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
            <th className="pb-2">Región</th>
            <th className="pb-2 text-right">Envíos</th>
            <th className="pb-2">A tiempo</th>
          </tr>
        </thead>
        <tbody>
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-8 text-center text-xs text-slate-400">
                Sin datos
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const pct = Math.round(r.onTimeRate * 100);
            return (
              <tr key={r.region} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50">
                <td className="py-2.5 font-medium text-slate-700">{r.region}</td>
                <td className="py-2.5 text-right tabular-nums text-slate-500">{r.shipments}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-indigo-50">
                      <div className="animate-grow-h h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-9 flex-shrink-0 text-right text-[11px] text-slate-400">{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
