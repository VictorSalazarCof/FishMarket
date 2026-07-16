// ============================================================
// G10 – Consumer de pagos vía RabbitMQ (integración G6, streaming)
// ============================================================
// A diferencia del resto de las integraciones de G10 (todas REST: G5, G7,
// G8, G9), G6 no tiene una URL pública desplegada — su único camino
// posible de integración es sumarse al bus de RabbitMQ que comparten
// G5/G6/G7/G8/G9 (hosteado en Railway).
//
// ✅ CONFIRMADO EN VIVO (calibración 2026-07-16, modo diagnóstico —
// bindeo "#" temporal, ver DIAGNOSTIC_MODE más abajo): el exchange real es
// "fishmarket" (topic), NO "payments.events" como declaraba el código
// local viejo de G6. En esa misma sesión se vieron pasar eventos de
// inventory-service (StockReserved) y order-service (OrderCreated) además
// de los de pago, confirmando que sí es un exchange realmente compartido.
//
// El envelope real que G6 publica hoy TAMBIÉN cambió respecto al código
// viejo de G6 (que usaba eventName/paymentId planos). Confirmado con dos
// capturas en vivo, consistentes entre sí, de routingKey="payment.pending":
//   {
//     eventId, eventType: "PaymentPending", producer: "G6-PaymentService",
//     payload: { paymentId, amount, currency, orderId, metadata: {} }
//   }
// Notar: NO trae version/occurredAt/correlationId/timestamp (a diferencia
// de StockReserved/OrderCreated del mismo exchange, que sí los traen) — el
// publisher de G6 quedó más simple que el "estándar" que usan G5/G7. El
// parseo sigue siendo defensivo por las dudas (eventName ?? eventType,
// timestamp ?? occurredAt ?? ahora, payload ?? data): si no se puede
// extraer ningún nombre de evento de ninguna forma, se loguea el mensaje
// crudo (warn) y no se procesa, en vez de asumir una forma y romper.
//
// ⚠️ SIN CONFIRMAR TODAVÍA: solo se observó routingKey="payment.pending"
// en vivo (dos veces, ~10 min de escucha en modo diagnóstico, sin que
// ningún pago llegara a resolverse a aprobado/rechazado en esa ventana).
// "payment.approved"/"payment.rejected" siguen siendo una INFERENCIA por
// patrón (mismo prefijo "payment.", mismo producer, y coincide con lo que
// declaraba el código viejo de G6), no una confirmación directa. Si algo
// no cuadra en producción, revisar esto primero — puede que approved/
// rejected tengan un shape distinto al de pending (ej. un motivo de
// rechazo) que no se pudo ver en esta calibración.

const amqp = require("amqplib");
const crypto = require("crypto");
const { query, isConfigured } = require("../db/pool");
const { incrementPaymentSummary } = require("../repositories/writeRepository");

const RABBITMQ_URL = process.env.RABBITMQ_URL; // sin default: si no está seteada, el consumer no arranca
const EXCHANGE = process.env.RABBITMQ_EXCHANGE || "fishmarket";
const ROUTING_KEYS = (process.env.G6_PAYMENT_ROUTING_KEYS || "payment.approved,payment.rejected")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);
const QUEUE_NAME = "g10-reporteria.payments";
const RECONNECT_DELAY_MS = 5000; // fijo, no exponencial — mantiene la simplicidad del resto del repo

// Modo diagnóstico temporal (calibración 2026-07): bindea "#" en el
// exchange compartido para observar TODO el tráfico y confirmar routing
// keys / formato real de los eventos de pago, en vez de asumirlos. Usa una
// cola separada, no durable, autoDelete — nunca toca report_payment_summaries
// ni streaming_events_log. Debe quedar en `false` fuera de una sesión de
// calibración: en modo normal solo bindea los routing keys de pago
// específicos, no todo el exchange compartido con G5/G7/G8.
const DIAGNOSTIC_MODE = process.env.G6_DIAGNOSTIC_MODE === "true";
const DIAGNOSTIC_QUEUE = "g10-diagnostico.payments";

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

function setupDiagnosticConsumer(logger) {
  logger.warn(
    `[g6-consumer] MODO DIAGNÓSTICO activo (G6_DIAGNOSTIC_MODE=true) — bindeando "#" en exchange="${EXCHANGE}", ` +
    `cola temporal "${DIAGNOSTIC_QUEUE}" (no durable, autoDelete). Esto recibe TODO el tráfico del exchange ` +
    `compartido con G5/G7/G8, no solo pagos. Solo loguea (routing key + body), nunca escribe en DB. ` +
    `Apagar G6_DIAGNOSTIC_MODE apenas termine la calibración.`
  );

  // exclusive: true es obligatorio acá — este broker (RabbitMQ moderno)
  // rechaza colas transitorias no-exclusivas con 541 INTERNAL-ERROR
  // ("Feature transient_nonexcl_queues is deprecated"), confirmado en vivo
  // al calibrar. Una cola exclusiva de scratch es justo el caso de uso
  // correcto de todas formas (solo esta conexión la usa, se borra sola).
  return channel.assertQueue(DIAGNOSTIC_QUEUE, { durable: false, autoDelete: true, exclusive: true }).then(({ queue }) => {
    return channel.bindQueue(queue, EXCHANGE, "#").then(() => {
      channel.consume(queue, (msg) => {
        if (!msg) return;
        const routingKey = msg.fields.routingKey;
        let body;
        try {
          body = JSON.stringify(JSON.parse(msg.content.toString()), null, 2);
        } catch {
          body = msg.content.toString();
        }
        logger.log(`[g6-diagnostico] routingKey="${routingKey}"\n${body}`);
        channel.ack(msg); // puramente observacional, no hay lógica de negocio que reintentar
      });
      logger.log(`[g6-consumer] Diagnóstico iniciado, exchange=${EXCHANGE}, queue=${queue}`);
    });
  });
}

function setupNormalConsumer(logger) {
  return channel.assertQueue(QUEUE_NAME, { durable: true }).then(async ({ queue }) => {
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

    logger.log(
      `[g6-consumer] Iniciado, exchange=${EXCHANGE}, routingKeys=${ROUTING_KEYS.join(",")}, queue=${queue}`
    );
  });
}

async function connect(logger = console) {
  if (!RABBITMQ_URL) {
    logger.warn("[g6-consumer] RABBITMQ_URL no configurada — el consumer de pagos de G6 no arranca.");
    return;
  }
  if (!DIAGNOSTIC_MODE && !isConfigured()) {
    logger.warn("[g6-consumer] DATABASE_URL no configurada — no tiene sentido consumir sin poder persistir, el consumer de G6 no arranca.");
    return;
  }

  try {
    connection = await amqp.connect(RABBITMQ_URL);

    // Registrar los listeners de "close"/"error" ANTES de crear el canal o
    // declarar exchange/cola es importante: un EventEmitter sin listener de
    // "error" hace throw y tumba el proceso entero (confirmado en vivo — un
    // rechazo del broker durante el setup del canal crasheó el proceso
    // antes de que estos handlers llegaran a registrarse).
    connection.on("close", () => {
      if (stopped) return;
      logger.warn(`[g6-consumer] Conexión a RabbitMQ cerrada — reintentando en ${RECONNECT_DELAY_MS}ms.`);
      scheduleReconnect(logger);
    });
    connection.on("error", (err) => {
      logger.error(`[g6-consumer] Error de conexión a RabbitMQ: ${describeError(err)}`);
    });

    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, "topic", { durable: true });

    if (DIAGNOSTIC_MODE) {
      await setupDiagnosticConsumer(logger);
    } else {
      await setupNormalConsumer(logger);
    }
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
