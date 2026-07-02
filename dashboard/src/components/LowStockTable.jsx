import { URGENCY_BADGE_CLASSES, URGENCY_DOT_CLASSES } from "../theme";
import { PanelSkeleton } from "./Skeleton";

export default function LowStockTable({ data, loading, error }) {
  const rows = data?.products || [];

  if (loading && !data) return <PanelSkeleton rows={5} />;

  return (
    <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-bold text-slate-800">Low Stock</span>
        {error && (
          <span className="text-xs text-red-500" role="alert">
            Error: {error}
          </span>
        )}
      </div>
      <div className="mb-4 text-[11.5px] text-slate-400">
        Productos bajo el punto de reorden{data ? ` (umbral: ${data.threshold} unidades)` : ""}.
      </div>

      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
            <th className="pb-2">Producto</th>
            <th className="pb-2 text-right">Stock</th>
            <th className="pb-2 text-right">Reorden</th>
            <th className="pb-2 text-right">Urgencia</th>
          </tr>
        </thead>
        <tbody>
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                Sin productos con stock bajo
              </td>
            </tr>
          )}
          {rows.map((p) => (
            <tr key={p.productId} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50">
              <td className="py-2.5 font-medium text-slate-700">{p.name}</td>
              <td className="py-2.5 text-right tabular-nums text-slate-500">{p.currentStock}</td>
              <td className="py-2.5 text-right tabular-nums text-slate-500">{p.reorderPoint}</td>
              <td className="py-2.5 text-right">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${URGENCY_BADGE_CLASSES[p.urgency]}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${URGENCY_DOT_CLASSES[p.urgency]}`} />
                  {p.urgency}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
