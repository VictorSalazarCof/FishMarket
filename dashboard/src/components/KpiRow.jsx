import StatTile from "./charts/StatTile";
import { formatCompactCurrency, formatNumber, formatPercent } from "../utils/format";

// Acento por dominio: finanzas (azul marca), operación (violeta),
// logística (verde) — agrupa visualmente los 6 KPIs en 3 familias en
// vez de repetir el mismo color 6 veces.
const ACCENT_FINANCE = "var(--brand)";
const ACCENT_OPERATIONS = "var(--series-5)";
const ACCENT_LOGISTICS = "var(--series-2)";

export default function KpiRow({ sales, fulfillment, trends, loading }) {
  const summary = sales?.summary;
  const metrics = fulfillment?.metrics;
  const insights = trends?.insights;
  const growthAccent = insights && insights.growthRate < 0 ? "var(--status-critical)" : "var(--status-good)";

  return (
    <div className={`grid grid--kpis ${loading ? "is-loading" : ""}`}>
      <StatTile accent={ACCENT_FINANCE} label="Ingresos totales" value={summary ? formatCompactCurrency(summary.totalRevenue) : "—"} />
      <StatTile accent={ACCENT_OPERATIONS} label="Pedidos totales" value={summary ? formatNumber(summary.totalOrders) : "—"} />
      <StatTile accent={ACCENT_FINANCE} label="Ticket promedio" value={summary ? formatCompactCurrency(summary.averageOrderValue) : "—"} />
      <StatTile accent={ACCENT_LOGISTICS} label="Tasa de fulfillment" value={metrics ? formatPercent(metrics.fulfillmentRate) : "—"} />
      <StatTile accent={ACCENT_LOGISTICS} label="Entregas a tiempo" value={metrics ? formatPercent(metrics.onTimeDeliveryRate) : "—"} />
      {insights && (
        <StatTile
          accent={growthAccent}
          label={`Crecimiento (pico: ${insights.peakDay})`}
          value={formatPercent(insights.growthRate)}
          delta={insights.growthRate * 100}
        />
      )}
    </div>
  );
}
