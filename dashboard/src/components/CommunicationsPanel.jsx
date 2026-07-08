import GroupedBars from "./charts/GroupedBars";
import { formatNumber } from "../utils/format";

const TYPE_LABELS = {
  order_confirmation: "Confirmación de pedido",
  shipment_update:    "Actualización de envío",
  delivery_confirmed: "Entrega confirmada",
  low_stock_alert:    "Alerta de stock bajo",
  promotional:         "Promocional",
};

export default function CommunicationsPanel({ communications, loading }) {
  const rows = (communications?.byType || []).map((t) => ({
    key: t.type,
    label: TYPE_LABELS[t.type] || t.type,
    values: [Math.round(t.openRate * 100), Math.round(t.clickRate * 100)],
  }));

  return (
    <div className={`card ${loading ? "is-loading" : ""}`}>
      <div className="card__header">
        <div>
          <h3 className="card__title">Comunicaciones</h3>
          <p className="card__subtitle">
            {communications ? `${formatNumber(communications.summary.totalSent)} enviadas` : ""}
          </p>
        </div>
      </div>
      <div className="card__body">
        <GroupedBars rows={rows} seriesNames={["Apertura %", "Clics %"]} formatValue={(v) => `${v}%`} max={100} />
      </div>
    </div>
  );
}
