// ============================================================
// G10 – Poller de notificaciones (integración G9, patrón batch)
// ============================================================
// Hace polling incremental (parámetro `from`) a G9_NOTIFICATIONS_URL,
// lleva el cursor en integration_cursor y evita reprocesar eventos con
// processed_notifications. Al detectar eventos de pedidos relevantes,
// resuelve el detalle en G5 y hace broadcast por WebSocket (streaming)
// para refrescar el dashboard.
//
// Shape confirmado con curl (2026-07-08) contra
// https://notification-service-i3bn.onrender.com/notifications:
//   { data: [...], pagination: {...}, unreadCount }, orden created_at DESC.
// Cada notificación viene con campos planos (sin `payload` anidado):
// eventId, eventType, correlationId, userId, createdAt, message.
//
// El pedido va embebido como texto libre en `message` tras un "#", pero
// el formato NO es consistente entre notificaciones reales y de
// demo/seed:
//   - Reales:  ".. pedido #547b4156-1d7e-4f8d-949c-a4cdb651665f .."
//              → es el UUID interno de G5 (columna `id`), confirmado con
//                GET /orders/:id devolviendo 200 directo, sin necesitar
//                buscarlo primero por userId.
//   - Demo/seed: ".. pedido #ORD-DEMO-001 .." → parece un order_number,
//                pero no tiene backing real en G5 (falla el lookup, es
//                esperado — son datos de prueba de G9 sin pedido real).
// Por eso se detecta si el token extraído matchea forma de UUID: si sí,
// se pide el detalle directo (1 llamada); si no, se cae al lookup de 2
// pasos por userId + order_number (para el caso legítimo de que G9
// algún día mande el order_number legible).

const crypto = require("crypto");
const { query, isConfigured } = require("../db/pool");
const { broadcast } = require("../websocket/broadcaster");
const { fetchOrderDetail, fetchOrderByNumber } = require("./g5OrdersClient");

const NOTIFICATIONS_URL =
  process.env.G9_NOTIFICATIONS_URL || "https://notification-service-i3bn.onrender.com/notifications";
const POLL_INTERVAL_MS = parseInt(process.env.G9_POLL_INTERVAL_MS || "30000", 10);
const PAGE_SIZE = parseInt(process.env.G9_PAGE_SIZE || "20", 10);

const ORDER_RELATED_TYPES = new Set([
  "OrderCreated",
  "PaymentPending",
  "PaymentApproved",
  "PaymentRejected",
  "StockRejected",
  "ShipmentCreated",
  "ShipmentPicking",
  "ShipmentOutForDelivery",
  "ShipmentDelivered",
  "ShipmentFailed",
]);

const ORDER_TOKEN_PATTERN = /#([A-Za-z0-9-]+)/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractOrderToken(message) {
  if (!message) return null;
  const match = message.match(ORDER_TOKEN_PATTERN);
  return match ? match[1] : null;
}

async function resolveOrderDetail(userId, orderToken, correlationId, logger) {
  if (!orderToken) return null;
  try {
    if (UUID_PATTERN.test(orderToken)) {
      return await fetchOrderDetail(orderToken, correlationId);
    }
    if (userId) {
      return await fetchOrderByNumber(userId, orderToken, correlationId);
    }
    logger.error(`[g9-poller] Token "${orderToken}" no es UUID y no hay userId para buscarlo por order_number`);
  } catch (err) {
    logger.error(`[g9-poller] No se pudo refrescar el pedido ${orderToken} desde G5: ${err.message}`);
  }
  return null;
}

const memoryProcessed = new Set();
let memoryCursor = { last_occurred_at: null };

async function getCursor() {
  if (!isConfigured()) return memoryCursor;
  const { rows } = await query(
    "SELECT last_occurred_at FROM integration_cursor WHERE integration_name = 'g9_notifications'"
  );
  return rows[0] || { last_occurred_at: null };
}

async function saveCursor(lastOccurredAt) {
  if (!isConfigured()) {
    memoryCursor = { last_occurred_at: lastOccurredAt };
    return;
  }
  await query(
    `INSERT INTO integration_cursor (integration_name, last_occurred_at, updated_at)
     VALUES ('g9_notifications', $1, now())
     ON CONFLICT (integration_name)
     DO UPDATE SET last_occurred_at = $1, updated_at = now()`,
    [lastOccurredAt]
  );
}

async function alreadyProcessed(eventId) {
  if (!isConfigured()) return memoryProcessed.has(eventId);
  const { rows } = await query("SELECT 1 FROM processed_notifications WHERE event_id = $1", [eventId]);
  return rows.length > 0;
}

async function markProcessed(notification, correlationId, orderId) {
  if (!isConfigured()) {
    memoryProcessed.add(notification.eventId);
    return;
  }
  await query(
    `INSERT INTO processed_notifications (event_id, event_type, order_id, correlation_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (event_id) DO NOTHING`,
    [notification.eventId, notification.eventType, orderId, correlationId]
  );
}

async function pollOnce(logger = console) {
  const correlationId = crypto.randomUUID();
  try {
    const cursor = await getCursor();
    const params = new URLSearchParams({ size: String(PAGE_SIZE) });
    if (cursor.last_occurred_at) params.set("from", new Date(cursor.last_occurred_at).toISOString());

    const url = `${NOTIFICATIONS_URL}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { "X-Correlation-Id": correlationId, "X-Consumer": "g10-reporteria" },
    });

    if (!response.ok) {
      logger.error(`[g9-poller] G9 respondió ${response.status} (correlationId=${correlationId})`);
      return;
    }

    const body = await response.json();
    const notifications = body.data || [];

    // Viene created_at DESC; se procesa en orden cronológico ascendente.
    const ordered = [...notifications].reverse();
    const relevant = ordered.filter((n) => ORDER_RELATED_TYPES.has(n.eventType));

    for (const notification of relevant) {
      if (await alreadyProcessed(notification.eventId)) continue;

      const orderToken = extractOrderToken(notification.message);
      const evtCorrelationId = notification.correlationId || correlationId;

      logger.log(
        `[g9-poller] Nuevo evento ${notification.eventType} orderToken=${orderToken} userId=${notification.userId} correlationId=${evtCorrelationId}`
      );

      const orderDetail = await resolveOrderDetail(notification.userId, orderToken, evtCorrelationId, logger);
      const orderId = orderDetail ? orderDetail.id : (orderToken && UUID_PATTERN.test(orderToken) ? orderToken : null);
      const orderNumber = (orderDetail && (orderDetail.orderNumber || orderDetail.order_number)) || (orderToken && !UUID_PATTERN.test(orderToken) ? orderToken : null);

      broadcast({
        type: "ORDER_DASHBOARD_REFRESH",
        eventType: notification.eventType,
        orderId,
        orderNumber,
        userId: notification.userId,
        order: orderDetail,
        correlationId: evtCorrelationId,
        createdAt: notification.createdAt,
      });

      await markProcessed(notification, evtCorrelationId, orderId);
    }

    if (notifications.length > 0) {
      await saveCursor(notifications[0].createdAt);
    }
  } catch (err) {
    logger.error(`[g9-poller] Error de polling (correlationId=${correlationId}): ${err.message}`);
  }
}

let timer = null;

function start(logger = console) {
  if (!isConfigured()) {
    logger.warn(
      "[g9-poller] DATABASE_URL no configurada — idempotencia y cursor quedan solo en memoria (se pierden al reiniciar)."
    );
  }
  pollOnce(logger);
  timer = setInterval(() => pollOnce(logger), POLL_INTERVAL_MS);
  logger.log(`[g9-poller] Iniciado, intervalo=${POLL_INTERVAL_MS}ms, url=${NOTIFICATIONS_URL}`);
}

function stop() {
  if (timer) clearInterval(timer);
}

module.exports = { start, stop, pollOnce };
