import { fmtMoneyFull, fmtPct } from "../format";
import { paymentSuccessTone } from "../theme";
import { PanelSkeleton } from "./Skeleton";

export default function PaymentTable({ data, loading, error }) {
  const rows = data?.byMethod || [];

  if (loading && !data) return <PanelSkeleton rows={4} />;

  return (
    <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-bold text-slate-800">Pagos exitosos por método</span>
        {error && (
          <span className="text-xs text-red-500" role="alert">
            Error: {error}
          </span>
        )}
      </div>
      <div className="mb-4 text-[11.5px] text-slate-400">Volumen y tasa de éxito por medio de pago.</div>

      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
            <th className="pb-2">Método</th>
            <th className="pb-2 text-right">Cant.</th>
            <th className="pb-2 text-right">Monto</th>
            <th className="pb-2 text-right">Estado</th>
          </tr>
        </thead>
        <tbody>
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                Sin datos
              </td>
            </tr>
          )}
          {rows.map((m) => (
            <tr key={m.method} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50">
              <td className="py-2.5 font-medium capitalize text-slate-700">{m.method.replace(/_/g, " ")}</td>
              <td className="py-2.5 text-right tabular-nums text-slate-500">{m.count}</td>
              <td className="py-2.5 text-right tabular-nums text-slate-500">{fmtMoneyFull(m.amount)}</td>
              <td className="py-2.5 text-right">
                <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${paymentSuccessTone(m.successRate)}`}>
                  {fmtPct(m.successRate)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
