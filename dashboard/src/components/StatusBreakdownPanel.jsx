import BarList from "./charts/BarList";
import { formatNumber } from "../utils/format";

const STATUS_LABELS = {
  delivered: "Entregado", processing: "Procesando", shipped: "Enviado",
  pending: "Pendiente", cancelled: "Cancelado", returned: "Devuelto",
};

// Mismo código de color que ya usan los badges de estado en OrdersTable
// y LowStockPanel — verde = resultado bueno, rojo = malo, ámbar = en
// espera, violeta = en curso sin connotación buena/mala.
const STATUS_COLOR = {
  delivered: "var(--status-good)",
  shipped: "var(--series-1)",
  processing: "var(--series-5)",
  pending: "var(--status-warning)",
  cancelled: "var(--status-critical)",
  returned: "var(--status-serious)",
};

export default function StatusBreakdownPanel({ status, loading }) {
  const breakdown = status?.statusBreakdown || [];
  const total = breakdown.reduce((sum, s) => sum + s.count, 0) || 1;

  const rows = breakdown
    .map((s) => ({
      key: s.status,
      label: STATUS_LABELS[s.status] || s.status,
      value: (s.count / total) * 100,
      count: s.count,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className={`card ${loading ? "is-loading" : ""}`}>
      <div className="card__header">
        <div>
          <h3 className="card__title">Pedidos por estado</h3>
          <p className="card__subtitle">{status ? `${formatNumber(status.totalOrders)} pedidos totales` : ""}</p>
        </div>
      </div>
      <div className="card__body">
        <BarList
          rows={rows}
          formatValue={(v) => `${v.toFixed(0)}%`}
          getNote={(row) => ` · ${formatNumber(row.count)} pedidos`}
          getColor={(row) => STATUS_COLOR[row.key] || "var(--seq-450)"}
        />
      </div>
    </div>
  );
}
