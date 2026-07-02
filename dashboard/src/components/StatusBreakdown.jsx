import { STATUS_HEX, STATUS_LABELS_ES } from "../theme";
import { PanelSkeleton } from "./Skeleton";
import Tooltip, { useTooltip } from "./Tooltip";

export default function StatusBreakdown({ data, loading, error }) {
  const { tooltipProps, show, hide } = useTooltip();

  const rows = data?.statusBreakdown || [];
  const max = Math.max(1, ...rows.map((r) => r.count));
  const chartKey = data ? `${data.period.startDate}-${data.period.endDate}` : "empty";

  if (loading && !data) return <PanelSkeleton rows={6} />;

  return (
    <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-bold text-slate-800">Pedidos por estado</span>
        {error && (
          <span className="text-xs text-red-500" role="alert">
            Error: {error}
          </span>
        )}
      </div>
      <div className="mb-4 text-[11.5px] text-slate-400">Distribución del total de pedidos en el período.</div>

      {!loading && data && rows.length === 0 && (
        <div className="py-9 text-center text-xs text-slate-400">Sin datos</div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-2.5" key={chartKey}>
          {rows.map((r, i) => {
            const w = Math.max(2, Math.round((r.count / max) * 100));
            const color = STATUS_HEX[r.status] || "#4f46e5";
            const label = STATUS_LABELS_ES[r.status] || r.status;
            return (
              <div
                className="flex items-center gap-2.5"
                key={r.status}
                onPointerMove={(e) =>
                  show(
                    e.clientX,
                    e.clientY,
                    <>
                      <div className="mb-1.5 text-white/50">{label}</div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-white/60">
                          <span className="h-0.5 w-2.5 rounded-full" style={{ background: color }} />
                          Pedidos
                        </span>
                        <span className="font-bold tabular-nums">{r.count}</span>
                      </div>
                      {r.avgProcessingTimeDays != null && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-white/60">Procesamiento prom.</span>
                          <span className="font-bold tabular-nums">{r.avgProcessingTimeDays} d</span>
                        </div>
                      )}
                    </>,
                  )
                }
                onPointerLeave={hide}
              >
                <span className="w-24 flex-shrink-0 truncate text-xs capitalize text-slate-500">{label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="animate-grow-h h-full rounded-full transition-opacity hover:opacity-80"
                    style={{ width: `${w}%`, background: color, "--bar-delay": `${i * 45}ms` }}
                  />
                </div>
                <span className="w-24 flex-shrink-0 text-right text-[11px] tabular-nums text-slate-400">
                  <strong className="font-semibold text-slate-700">{r.count}</strong> · {r.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Tooltip {...tooltipProps} />
    </div>
  );
}
