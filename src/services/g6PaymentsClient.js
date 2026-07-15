// ============================================================
// G10 – Cliente de pagos (integración G6) — SCAFFOLD, BLOQUEADO
// ============================================================
// G6 expone GET /api/payments/stats (payment.controller.ts lo construyó
// explícitamente pensando en G10: prisma.payment.groupBy({ by: ['status'],
// _count, _sum })), pero no hay evidencia de que esté desplegado en ningún
// lado: no tiene render.yaml, no menciona Railway/CloudAMQP en ningún
// archivo, su RABBITMQ_URL apunta a localhost:5672 y el baseUrl de sus
// propias pruebas es localhost:3000.
//
// Este archivo es solo scaffold — NO se llama desde ningún job todavía
// (liveIntegrationsSync.js no lo importa). Activar recién cuando G6
// confirme una URL de producción real y la publique en G6_PAYMENTS_SERVICE_URL.

const G6_BASE_URL = process.env.G6_PAYMENTS_SERVICE_URL; // sin fallback: no existe una URL de producción real todavía

function isConfigured() {
  return Boolean(G6_BASE_URL);
}

function g6Headers(correlationId) {
  return {
    "X-Correlation-Id": correlationId,
    "X-Request-Id": correlationId,
    "X-Consumer": "g10-reporteria",
  };
}

// Contrato tomado de su código fuente (payment.controller.ts), no
// confirmado en vivo porque el servicio no está desplegado:
//   GET /api/payments/stats → [{ status, _count: { id }, _sum: { amount } }]
async function fetchPaymentStats(correlationId) {
  if (!isConfigured()) {
    throw new Error("G6_PAYMENTS_SERVICE_URL no configurado - G6 todavía no despliega un servicio real");
  }

  const response = await fetch(`${G6_BASE_URL}/api/payments/stats`, {
    headers: g6Headers(correlationId),
  });

  if (!response.ok) {
    throw new Error(`G6 respondió ${response.status} al pedir estadísticas de pagos`);
  }

  return response.json();
}

module.exports = { isConfigured, fetchPaymentStats };
