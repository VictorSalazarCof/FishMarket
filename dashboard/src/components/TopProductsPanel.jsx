import BarList from "./charts/BarList";
import { formatCompactCurrency, formatNumber } from "../utils/format";

export default function TopProductsPanel({ products, loading }) {
  const list = products?.topProducts || [];
  const rows = list.map((p) => ({ key: p.productId, label: p.name || p.productId, value: p.revenue }));
  const byId = Object.fromEntries(list.map((p) => [p.productId, p]));

  return (
    <div className={`card ${loading ? "is-loading" : ""}`}>
      <div className="card__header">
        <div>
          <h3 className="card__title">Productos más vendidos</h3>
          <p className="card__subtitle">Por ingresos en el período</p>
        </div>
      </div>
      <div className="card__body">
        <BarList
          rows={rows}
          formatValue={(v) => formatCompactCurrency(v)}
          getNote={(row) => (byId[row.key] ? ` · ${formatNumber(byId[row.key].unitsSold)} uds` : "")}
        />
      </div>
    </div>
  );
}
