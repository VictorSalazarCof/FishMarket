// ============================================================
// G10 – Consumer de pagos vía RabbitMQ (integración G6, streaming)
// ============================================================
// A diferencia del resto de las integraciones de G10 (todas REST: G5, G7,
// G8, G9), G6 no tiene una URL pública desplegada — su único camino
// posible de integración es sumarse al bus de RabbitMQ que, según G6,
// comparten G5/G6/G8/G9 (hosteado en Railway).
//
// ⚠️ SIN CONFIRMAR — no dar por bueno sin que G6 lo confirme por escrito:
// el código real de G6 (src/events/event.publisher.ts) declara el
// exchange "payments.events" (topic), NO "fishmarket" (el exchange
// compartido que sí confirmamos con G7 y con el .env.example de G8). G6
// afirmó verbalmente estar en el mismo bus que el resto, pero su propio
// código no lo respalda. Queda configurable por RABBITMQ_EXCHANGE, con el
// valor real de su código como default — preguntarle a Víctor si G6 ya
// confirmó el nombre antes de dar esto por cerrado.
//
// El envelope que G6 realmente construye difiere del estándar que
// documentó G7 para el bus compartido (eventId, eventType, version,
// occurredAt, producer, correlationId, payload). El de G6 es:
//   { eventId, eventName, paymentId, timestamp, payload: {...} }
// Por eso el parseo es defensivo: eventName ?? eventType, timestamp ??
// occurredAt — y si no se puede extraer ningún nombre de evento de
// ninguna de las dos formas, se loguea el mensaje crudo (warn) y no se
// procesa, en vez de asumir una forma y romper.
//
// Routing keys confirmados por el propio código de G6 (fuente confiable,
// es su repo): payment.approved, payment.rejected, payment.pending. Solo
// se consumen los dos primeros por default — payment.pending no aporta a
// reportería de resultados (pagos ya resueltos).

const amqp = require("amqplib");
const crypto = require("crypto");
const { query, isConfigured } = require("../db/pool");
const { incrementPaymentSummary } = require("../repositories/writeRepository");

const RABBITMQ_URL = process.env.RABBITMQ_URL; // sin default: si no está seteada, el consumer no arranca
const EXCHANGE = process.env.RABBITMQ_EXCHANGE || "payments.events";
const ROUTING_KEYS = (process.env.G6_PAYMENT_ROUTING_KEYS || "payment.approved,payment.rejected")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);
const QUEUE_NAME = "g10-reporteria.payments";
const RECONNECT_DELAY_MS = 5000; // fijo, no exponencial — mantiene la simplicidad del resto del repo

const RECOGNIZED_EVENT_NAMES = new Set(["PaymentApproved", "PaymentRejected"]);

// G6 no distingue métodos de pago en su modelo (Payment: id, amount,
// currency, status, idempotencyKey, orderId, version, timestamps) — no
// existe payment_method, y report_payment_summaries lo exige NOT NULL. Se
// usa un valor fijo como placeholder de un único método agregado; no es
// un bug ni un dato real de negocio, es la mejor aproximación posible con
// lo que el evento trae hoy.
// (Se descartó usar `currency` como dimensión alternativa a
// payment_method: para esta primera versión conviene mantenerlo simple —
// un solo método agregado — en vez de fragmentar por moneda sin que nadie
// lo haya pedido.)
const PLACEHOLDER_PAYMENT_METHOD = "checkout";

function today() {
  return new Date().toISOString().split("T")[0];
}

// Los errores de conexión de amqplib suelen llegar como AggregateError con
// `message` vacío (típico de un ECONNREFUSED) — sin esto, el log queda en
// blanco y no sirve para diagnosticar una RABBITMQ_URL mal configurada.
function describeError(err) {
  return err.message || err.code || String(err);
}

function extractEventName(evt) {
  return evt.eventName || evt.eventType || null;
}

function extractOccurredAt(evt) {
  return evt.timestamp || evt.occurredAt || new Date().toISOString();
}

function extractPayment(evt) {
  const source = evt.payload || evt.data || {};
  return {
    paymentId: source.paymentId || evt.paymentId || null,
    amount: source.amount,
    currency: source.currency,
    orderId: source.orderId,
    status: source.status,
  };
}

async function handleMessage(channel, msg, logger) {
  let parsed;
  try {
    parsed = JSON.parse(msg.content.toString());
  } catch (err) {
    logger.error(`[g6-consumer] No se pudo parsear el mensaje, se descarta (no se reencola): ${err.message}`);
    channel.nack(msg, false, false);
    return;
  }

  const eventName = extractEventName(parsed);
  if (!eventName) {
    logger.warn(`[g6-consumer] Mensaje sin eventName/eventType reconocible, se ignora: ${JSON.stringify(parsed)}`);
    channel.ack(msg);
    return;
  }

  let eventId = parsed.eventId;
  if (!eventId) {
    eventId = crypto.randomUUID();
    logger.warn(
      `[g6-consumer] Mensaje sin eventId — se genera uno nuevo (${eventId}); si G6 reenvía este mismo evento no vamos a poder detectar el duplicado.`
    );
  }

  const occurredAt = extractOccurredAt(parsed);
  const payment = extractPayment(parsed);

  try {
    // Idempotencia en un solo round-trip: si event_id ya existe, el
    // INSERT no devuelve filas y no se reprocesa nada.
    const { rows } = await query(
      `INSERT INTO streaming_events_log (event_id, event_type, source_group, payload, processed)
       VALUES ($1, $2, 'G6', $3, true)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId, eventName, JSON.stringify({ ...parsed, occurredAt })]
    );

    if (rows.length === 0) {
      logger.log(`[g6-consumer] Evento ${eventId} (${eventName}) ya estaba procesado, se ignora.`);
      channel.ack(msg);
      return;
    }

    if (RECOGNIZED_EVENT_NAMES.has(eventName)) {
      await incrementPaymentSummary({
        date: today(),
        method: PLACEHOLDER_PAYMENT_METHOD,
        amount: Number(payment.amount) || 0,
        success: eventName === "PaymentApproved",
      });
      logger.log(
        `[g6-consumer] report_payment_summaries incrementado por ${eventName} (paymentId=${payment.paymentId}, eventId=${eventId})`
      );
    } else {
      // Un routing key/eventName que hoy no consumimos o que G6 agregue
      // más adelante — se registra en streaming_events_log para no perder
      // el evento, pero no rompe el consumer ni se inventa un incremento.
      logger.warn(`[g6-consumer] eventName "${eventName}" no reconocido, se loguea pero no incrementa payment_summary.`);
    }

    channel.ack(msg);
  } catch (err) {
    logger.error(`[g6-consumer] Error al persistir el evento ${eventId}, se reencola: ${err.message}`);
    channel.nack(msg, false, true);
  }
}

let connection = null;
let channel = null;
let reconnectTimer = null;
let stopped = false;

function scheduleReconnect(logger) {
  if (stopped || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(logger);
  }, RECONNECT_DELAY_MS);
}

async function connect(logger = console) {
  if (!RABBITMQ_URL) {
    logger.warn("[g6-consumer] RABBITMQ_URL no configurada — el consumer de pagos de G6 no arranca.");
    return;
  }
  if (!isConfigured()) {
    logger.warn("[g6-consumer] DATABASE_URL no configurada — no tiene sentido consumir sin poder persistir, el consumer de G6 no arranca.");
    return;
  }

  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, "topic", { durable: true });
    const { queue } = await channel.assertQueue(QUEUE_NAME, { durable: true });

    for (const key of ROUTING_KEYS) {
      await channel.bindQueue(queue, EXCHANGE, key);
    }

    channel.consume(queue, (msg) => {
      if (!msg) return;
      const ch = channel;
      handleMessage(ch, msg, logger).catch((err) => {
        logger.error(`[g6-consumer] Error inesperado procesando mensaje: ${describeError(err)}`);
        ch.nack(msg, false, true);
      });
    });

    connection.on("close", () => {
      if (stopped) return;
      logger.warn(`[g6-consumer] Conexión a RabbitMQ cerrada — reintentando en ${RECONNECT_DELAY_MS}ms.`);
      scheduleReconnect(logger);
    });
    connection.on("error", (err) => {
      logger.error(`[g6-consumer] Error de conexión a RabbitMQ: ${describeError(err)}`);
    });

    logger.log(
      `[g6-consumer] Iniciado, exchange=${EXCHANGE}, routingKeys=${ROUTING_KEYS.join(",")}, queue=${queue}`
    );
  } catch (err) {
    logger.error(`[g6-consumer] No se pudo conectar a RabbitMQ: ${describeError(err)} — reintentando en ${RECONNECT_DELAY_MS}ms.`);
    scheduleReconnect(logger);
  }
}

function start(logger = console) {
  stopped = false;
  connect(logger);
}

function stop() {
  stopped = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (channel) channel.close().catch(() => {});
  if (connection) connection.close().catch(() => {});
}

module.exports = { start, stop };
