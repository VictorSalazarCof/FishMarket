import Meter from "./charts/Meter";
import BarList from "./charts/BarList";
import { formatNumber, formatPercent } from "../utils/format";

export default function FulfillmentPanel({ fulfillment, loading }) {
  const metrics = fulfillment?.metrics;
  const regionRows = (fulfillment?.byRegion || []).map((r) => ({
    key: r.region, label: r.region, value: r.shipments, onTimeRate: r.onTimeRate,
  }));

  return (
    <div className={`card ${loading ? "is-loading" : ""}`}>
      <div className="card__header">
        <div>
          <h3 className="card__title">Fulfillment</h3>
          <p className="card__subtitle">
            {metrics ? `${formatNumber(metrics.totalShipments)} envíos · ${formatNumber(metrics.deliveredCount)} entregados` : ""}
          </p>
        </div>
      </div>
      <div className="card__body grid" style={{ gap: 14 }}>
        {metrics && (
          <>
            <Meter label="Tasa de fulfillment" ratio={metrics.fulfillmentRate} formatValue={(r) => formatPercent(r)} />
            <Meter label="Entregas a tiempo" ratio={metrics.onTimeDeliveryRate} formatValue={(r) => formatPercent(r)} />
          </>
        )}
        <div>
          <p className="card__subtitle" style={{ marginBottom: 6 }}>Envíos por región</p>
          <BarList
            rows={regionRows}
            formatValue={(v) => formatNumber(v)}
            getNote={(row) => ` · ${formatPercent(row.onTimeRate)} a tiempo`}
          />
        </div>
      </div>
    </div>
  );
}
