import BarList from "./charts/BarList";
import { formatCompactCurrency, formatNumber, formatPercent } from "../utils/format";

const METHOD_LABELS = {
  credit_card: "Tarjeta de crédito", debit_card: "Tarjeta de débito",
  bank_transfer: "Transferencia", paypal: "PayPal",
};

export default function PaymentsPanel({ payments, loading }) {
  const rows = (payments?.byMethod || []).map((m) => ({
    key: m.method, label: METHOD_LABELS[m.method] || m.method, value: m.amount,
    count: m.count, successRate: m.successRate,
  }));

  return (
    <div className={`card ${loading ? "is-loading" : ""}`}>
      <div className="card__header">
        <div>
          <h3 className="card__title">Pagos por método</h3>
          <p className="card__subtitle">
            {payments ? `${formatCompactCurrency(payments.summary.totalAmount)} procesados` : ""}
          </p>
        </div>
      </div>
      <div className="card__body">
        <BarList
          rows={rows}
          formatValue={(v) => formatCompactCurrency(v)}
          getNote={(row) => ` · ${formatNumber(row.count)} pagos · ${formatPercent(row.successRate)} éxito`}
        />
      </div>
    </div>
  );
}
