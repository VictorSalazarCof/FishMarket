// ============================================================
// G10 – Cliente de órdenes (integración G5)
// ============================================================
// Confirmado en vivo (2026-07-08) contra https://pedidos-g5.onrender.com:
//   GET /orders?userId=X&limit=N  → { data: [{id, order_number, user_id,
//     status, total_amount, created_at, updated_at}], pagination }
//   GET /orders/:id                → detalle completo (items, history).
//     :id es el UUID interno (columna `id`), NO el `order_number` legible.

const G5_BASE_URL = process.env.ORDERS_SERVICE_URL || "https://pedidos-g5.onrender.com";

function g5Headers(correlationId) {
  return {
    "X-Correlation-Id": correlationId,
    "X-Request-Id": correlationId,
    "X-Consumer": "g10-reporteria",
  };
}

async function findOrderSummary(userId, orderNumber, correlationId) {
  const url = `${G5_BASE_URL}/orders?userId=${encodeURIComponent(userId)}&limit=50`;
  const response = await fetch(url, { headers: g5Headers(correlationId) });

  if (!response.ok) {
    throw new Error(`G5 respondió ${response.status} al listar pedidos de userId=${userId}`);
  }

  const body = await response.json();
  const orders = body.data || [];
  return orders.find((o) => o.order_number === orderNumber) || null;
}

async function fetchOrderDetail(orderUuid, correlationId) {
  const response = await fetch(`${G5_BASE_URL}/orders/${orderUuid}`, {
    headers: g5Headers(correlationId),
  });

  if (!response.ok) {
    throw new Error(`G5 respondió ${response.status} para el pedido ${orderUuid}`);
  }

  return response.json();
}

async function fetchOrderByNumber(userId, orderNumber, correlationId) {
  const summary = await findOrderSummary(userId, orderNumber, correlationId);
  if (!summary) {
    throw new Error(`No se encontró el pedido ${orderNumber} para userId=${userId} en G5`);
  }
  return fetchOrderDetail(summary.id, correlationId);
}

module.exports = { fetchOrderByNumber, fetchOrderDetail, findOrderSummary };
