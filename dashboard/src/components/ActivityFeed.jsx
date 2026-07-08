// Feed cronológico de TODO lo que llega por WebSocket — la vitrina
// del patrón streaming: batch progress, alertas de inventario y
// refrescos de pedidos, todo en un mismo timeline en vivo.

import { timeAgo } from "../utils/format";

const EVENT_META = {
  ORDER_DASHBOARD_REFRESH: { color: "var(--series-1)", title: (e) => `Pedido ${e.orderNumber || e.orderId || ""} — ${e.eventType}` },
  "batch:queued":    { color: "var(--text-muted)",     title: (e) => `Job ${e.jobId} encolado` },
  "batch:running":   { color: "var(--status-warning)", title: (e) => `Job ${e.jobId} en progreso (${e.progress ?? "?"}%)` },
  "batch:completed": { color: "var(--status-good)",    title: () => "Recalculación de reportes completada" },
  "batch:failed":    { color: "var(--status-critical)", title: () => "Falló la recalculación de reportes" },
  "inventory:alert": { color: "var(--status-critical)", title: (e) => e.message || "Alerta de inventario" },
  "report:updated":  { color: "var(--series-2)",       title: () => "Reportes actualizados" },
};

export default function ActivityFeed({ events }) {
  const list = events || [];

  return (
    <div className="card">
      <div className="card__header">
        <div>
          <h3 className="card__title">Actividad en vivo</h3>
          <p className="card__subtitle">Batch, inventario y streaming de pedidos</p>
        </div>
      </div>
      <div className="card__body">
        {list.length === 0 ? (
          <p className="activity-empty">Sin eventos todavía — se llena solo por WebSocket.</p>
        ) : (
          <div className="activity-feed">
            {list.map((e, i) => {
              const meta = EVENT_META[e.type] || { color: "var(--text-muted)", title: () => e.type };
              return (
                <div className="activity-item" key={`${e.type}-${e.receivedAt}-${i}`}>
                  <span className="activity-item__dot" style={{ background: meta.color }} />
                  <div className="activity-item__body">
                    <div className="activity-item__title">{meta.title(e)}</div>
                    <div className="activity-item__meta">
                      <span>{timeAgo(e.receivedAt)}</span>
                      {e.correlationId && <span title={e.correlationId}>corr: {String(e.correlationId).slice(0, 8)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
