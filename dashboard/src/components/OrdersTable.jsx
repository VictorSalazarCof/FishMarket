// Tabla de órdenes del dashboard — alimentada en vivo por el evento
// ORDER_DASHBOARD_REFRESH (integración G9 → G5 → WebSocket), no por
// un endpoint REST (G10 no expone un listado de órdenes propio).

import { formatCompactCurrency, timeAgo } from "../utils/format";

const EVENT_LABELS = {
  OrderCreated: "Pedido creado", PaymentPending: "Pago pendiente", PaymentApproved: "Pago aprobado",
  PaymentRejected: "Pago rechazado", StockRejected: "Stock rechazado", ShipmentCreated: "Envío creado",
  ShipmentPicking: "Preparando envío", ShipmentOutForDelivery: "En reparto",
  ShipmentDelivered: "Entregado", ShipmentFailed: "Envío fallido",
};

const EVENT_BADGE = {
  OrderCreated: "badge--neutral", PaymentPending: "badge--warning", PaymentApproved: "badge--good",
  PaymentRejected: "badge--critical", StockRejected: "badge--critical", ShipmentCreated: "badge--neutral",
  ShipmentPicking: "badge--warning", ShipmentOutForDelivery: "badge--warning",
  ShipmentDelivered: "badge--good", ShipmentFailed: "badge--critical",
};

export default function OrdersTable({ events }) {
  const orderEvents = (events || []).filter((e) => e.type === "ORDER_DASHBOARD_REFRESH").slice(0, 12);

  return (
    <div className="card">
      <div className="card__header">
        <div>
          <h3 className="card__title">Actividad de pedidos</h3>
          <p className="card__subtitle">En vivo — integración G9 → G5 → WebSocket</p>
        </div>
      </div>
      <div className="card__body table-wrap">
        {orderEvents.length === 0 ? (
          <p className="empty-state">Esperando eventos de pedidos por streaming…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Pedido</th><th>Evento</th><th>Usuario</th><th>Monto</th><th>Cuándo</th></tr>
            </thead>
            <tbody>
              {orderEvents.map((e, i) => (
                <tr key={`${e.correlationId}-${i}`}>
                  <td>{e.orderNumber || "—"}</td>
                  <td>
                    <span className={`badge ${EVENT_BADGE[e.eventType] || "badge--neutral"}`}>
                      {EVENT_LABELS[e.eventType] || e.eventType}
                    </span>
                  </td>
                  <td>{e.userId || "—"}</td>
                  <td>{e.order?.totalAmount ? formatCompactCurrency(e.order.totalAmount) : "—"}</td>
                  <td>{timeAgo(e.receivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
