import StatTile from "./charts/StatTile";
import { formatCompactCurrency, formatNumber, formatPercent } from "../utils/format";

export default function KpiRow({ sales, fulfillment, trends, loading }) {
  const summary = sales?.summary;
  const metrics = fulfillment?.metrics;
  const insights = trends?.insights;

  return (
    <div className={`grid grid--kpis ${loading ? "is-loading" : ""}`}>
      <StatTile label="Ingresos totales" value={summary ? formatCompactCurrency(summary.totalRevenue) : "—"} />
      <StatTile label="Pedidos totales" value={summary ? formatNumber(summary.totalOrders) : "—"} />
      <StatTile label="Ticket promedio" value={summary ? formatCompactCurrency(summary.averageOrderValue) : "—"} />
      <StatTile label="Tasa de fulfillment" value={metrics ? formatPercent(metrics.fulfillmentRate) : "—"} />
      <StatTile label="Entregas a tiempo" value={metrics ? formatPercent(metrics.onTimeDeliveryRate) : "—"} />
      {insights && (
        <StatTile
          label={`Crecimiento (pico: ${insights.peakDay})`}
          value={formatPercent(insights.growthRate)}
          delta={insights.growthRate * 100}
        />
      )}
    </div>
  );
}
