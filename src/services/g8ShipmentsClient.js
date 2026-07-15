// ============================================================
// G10 – Cliente de despacho/logística (integración G8)
// ============================================================
// Confirmado en vivo (2026-07-15) contra
// https://arq-microservicio-de-despacho-y-logistica.onrender.com:
//   GET /v1/shipments?page=&pageSize=&status=&orderId= →
//     { items: [Shipment], page, pageSize, total }
//   OJO: el campo es `items`, no `data`, y no trae `totalPages` — hay que
//   calcularlo con Math.ceil(total / pageSize).
// Shipment: { shipmentId, orderId, userId, status, lines, shipTo, driverId,
//   driverName, createdAt, updatedAt, deliveredAt, version }
// status ∈ CREATED | PICKING | ASSIGNED | OUT_FOR_DELIVERY | DELIVERED | FAILED
// shipTo trae { fullName, addressLine1, city, country } — en la práctica
// `region` puede venir ausente (confirmado con datos reales), así que quien
// consuma esto debe tener un fallback (ver liveIntegrationsSync.js).
//
// Excepción deliberada de header: el propio OpenAPI de G8 pide
// X-Consumer: "reporting-service" para lecturas desde G10 (no
// "g10-reporteria" como el resto de los clientes) — es así a propósito,
// no lo "corrijas" para que matchee a los demás.

const G8_BASE_URL =
  process.env.G8_SHIPMENTS_SERVICE_URL || "https://arq-microservicio-de-despacho-y-logistica.onrender.com";
const MAX_PAGES = 10; // tope de seguridad para fetchAllShipments, evita loop infinito si algo viene mal

function g8Headers(correlationId) {
  return {
    "X-Correlation-Id": correlationId,
    "X-Consumer": "reporting-service",
  };
}

async function fetchShipmentsPage({ page = 1, pageSize = 50, status, orderId } = {}, correlationId) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set("status", status);
  if (orderId) params.set("orderId", orderId);

  const response = await fetch(`${G8_BASE_URL}/v1/shipments?${params.toString()}`, {
    headers: g8Headers(correlationId),
  });

  if (!response.ok) {
    throw new Error(`G8 respondió ${response.status} al listar envíos (page=${page})`);
  }

  return response.json();
}

async function fetchAllShipments(correlationId) {
  const pageSize = 50;
  const first = await fetchShipmentsPage({ page: 1, pageSize }, correlationId);
  const items = [...(first.items || [])];
  const totalPages = Math.min(Math.ceil((first.total || 0) / pageSize) || 1, MAX_PAGES);

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchShipmentsPage({ page, pageSize }, correlationId);
    items.push(...(next.items || []));
  }

  return items;
}

module.exports = { fetchShipmentsPage, fetchAllShipments };
