import { STATUS_LABELS_ES } from "../theme";

const WATCH_STATUSES = ["pending", "cancelled", "returned"];

export default function CriticalOrders({ status, lowStock }) {
  const watchRows = (status.data?.statusBreakdown || []).filter((r) => WATCH_STATUSES.includes(r.status));
  const criticalProducts = (lowStock.data?.products || []).filter((p) => p.urgency === "critical");

  return (
    <div className="flex flex-col gap-4">
      <div className="animate-rise-in rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
        <span className="font-display text-sm font-bold text-slate-800">Vista de atención — Pedidos y stock críticos</span>
        <p className="mt-1.5 text-[11.5px] text-slate-500">
          Pedidos en estados de riesgo (pendiente, cancelado, devuelto) y productos por debajo del nivel crítico de
          stock. Requieren seguimiento prioritario.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="font-display text-sm font-bold text-slate-800">Pedidos en estados de riesgo</span>
            {status.error && <span className="text-xs text-red-500">Error: {status.error}</span>}
          </div>
          <div className="mb-4 text-[11.5px] text-slate-400">
            Suman {watchRows.reduce((s, r) => s + r.count, 0)} pedido(s) en el período.
          </div>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2">Estado</th>
                <th className="pb-2 text-right">Cantidad</th>
                <th className="pb-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {status.loading && !status.data && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!status.loading && watchRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-slate-400">
                    Sin pedidos en riesgo en este período
                  </td>
                </tr>
              )}
              {watchRows.map((r) => (
                <tr key={r.status} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium capitalize text-slate-700">{STATUS_LABELS_ES[r.status] || r.status}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-500">{r.count}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-500">{r.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="font-display text-sm font-bold text-slate-800">Productos en stock crítico</span>
            {lowStock.error && <span className="text-xs text-red-500">Error: {lowStock.error}</span>}
          </div>
          <div className="mb-4 text-[11.5px] text-slate-400">Stock ≤ 3 unidades — riesgo inminente de quiebre.</div>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2">Producto</th>
                <th className="pb-2 text-right">Stock</th>
                <th className="pb-2 text-right">Reorden</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.loading && !lowStock.data && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!lowStock.loading && criticalProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-slate-400">
                    Sin productos en nivel crítico
                  </td>
                </tr>
              )}
              {criticalProducts.map((p) => (
                <tr key={p.productId} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium text-slate-700">{p.name}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-500">{p.currentStock}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-500">{p.reorderPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
