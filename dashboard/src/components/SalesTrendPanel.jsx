// Tendencia en el tiempo: dos "small multiples" de una sola serie
// cada uno (nunca un eje dual) — ingresos ($) y pedidos (#), cada
// cual con su propio hue secuencial (blue / aqua, el segundo slot
// categórico, tal como indica la paleta para contextos secuenciales
// simultáneos).

import TrendChart from "./charts/TrendChart";
import { formatCompactCurrency, formatNumber, formatDateShort } from "../utils/format";

export default function SalesTrendPanel({ sales, loading }) {
  const series = sales?.timeSeries || [];
  const revenueData = series.map((d) => ({ label: formatDateShort(d.date), value: d.revenue }));
  const ordersData = series.map((d) => ({ label: formatDateShort(d.date), value: d.orders }));

  return (
    <div className={`card ${loading ? "is-loading" : ""}`}>
      <div className="card__header">
        <div>
          <h3 className="card__title">Ingresos y pedidos en el tiempo</h3>
          <p className="card__subtitle">Serie según el filtro de agrupación</p>
        </div>
      </div>
      <div className="card__body grid" style={{ gap: 18 }}>
        <div>
          <p className="card__subtitle" style={{ marginBottom: 4 }}>Ingresos</p>
          <TrendChart
            data={revenueData} color="var(--seq-450)" seriesName="Ingresos"
            formatValue={(v) => formatCompactCurrency(v)} height={140}
          />
        </div>
        <div>
          <p className="card__subtitle" style={{ marginBottom: 4 }}>Pedidos</p>
          <TrendChart
            data={ordersData} color="var(--series-2)" seriesName="Pedidos"
            formatValue={(v) => formatNumber(v)} height={140}
          />
        </div>
      </div>
    </div>
  );
}
