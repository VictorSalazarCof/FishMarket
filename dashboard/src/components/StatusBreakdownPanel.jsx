import StackedBar from "./charts/StackedBar";
import { formatNumber } from "../utils/format";

const STATUS_LABELS = {
  delivered: "Entregado", processing: "Procesando", shipped: "Enviado",
  pending: "Pendiente", cancelled: "Cancelado", returned: "Devuelto",
};

export default function StatusBreakdownPanel({ status, loading }) {
  const segments = (status?.statusBreakdown || []).map((s) => ({
    key: s.status, label: STATUS_LABELS[s.status] || s.status, value: s.count,
  }));

  return (
    <div className={`card ${loading ? "is-loading" : ""}`}>
      <div className="card__header">
        <div>
          <h3 className="card__title">Pedidos por estado</h3>
          <p className="card__subtitle">{status ? `${formatNumber(status.totalOrders)} pedidos totales` : ""}</p>
        </div>
      </div>
      <div className="card__body">
        <StackedBar segments={segments} formatValue={(v) => formatNumber(v)} />
      </div>
    </div>
  );
}
