// ============================================================
// G10 – Sync de integraciones en vivo (G7 + G8, patrón batch)
// ============================================================
// Cada LIVE_SYNC_INTERVAL_MS, trae inventario real de G7 y envíos reales
// de G8, y los persiste reutilizando los mismos upsert de
// writeRepository.js que ya usa la recalculación batch sintética
// (src/repositories/batchRepository.js) — no duplica lógica de SQL, solo
// arma el objeto `metrics` parcial con la forma que esas funciones ya
// esperan.
//
// No toca report_sales_daily, report_product_metrics, report_order_status,
// report_payment_summaries ni report_communications_summary — esas tablas
// siguen dependiendo exclusivamente de POST /api/v1/batch/recalculate
// (datos sintéticos), que es un flujo aparte de este sync en vivo.

const crypto = require("crypto");
const { isConfigured: isDbConfigured } = require("../db/pool");
const { fetchAllInventory } = require("./g7InventoryClient");
const { fetchAllShipments } = require("./g8ShipmentsClient");
const { fetchCatalogMap } = require("./g3CatalogClient");
const { upsertInventorySnapshots, upsertFulfillment } = require("../repositories/writeRepository");

const SYNC_INTERVAL_MS = parseInt(process.env.LIVE_SYNC_INTERVAL_MS || "60000", 10);

// Decisión de negocio: G7 no expone reorderPoint (punto de reorden) para
// ningún producto. Se usa el mismo umbral por defecto que ya usa
// GET /api/v1/inventory/low-stock (10) en vez de enterrarlo como número
// mágico — si el umbral de negocio cambia, se cambia acá.
const DEFAULT_REORDER_POINT = 10;

function today() {
  return new Date().toISOString().split("T")[0];
}

// ────────────────────────────────────────────────
// Inventario (G7)
// ────────────────────────────────────────────────
async function syncInventory(correlationId, logger = console) {
  if (!isDbConfigured()) {
    logger.warn("[live-sync] DATABASE_URL no configurada — se omite syncInventory (G7).");
    return;
  }

  const items = await fetchAllInventory(correlationId);

  // Enriquecer con nombre/categoría real desde el catálogo de G3
  // (productId de G7 == id de producto en G3, confirmado en vivo — ver
  // g3CatalogClient.js). Si G3 falla, no se aborta el sync de inventario:
  // se cae al mismo fallback que existía antes de esta integración
  // (productId como nombre, category null), mismo criterio de degradación
  // tolerante que usa el resto de las integraciones de este archivo.
  let catalogMap = new Map();
  try {
    catalogMap = await fetchCatalogMap(correlationId);
  } catch (err) {
    logger.error(
      `[live-sync] No se pudo enriquecer inventario con el catálogo de G3 (correlationId=${correlationId}): ${err.message}`
    );
  }

  const inventory = items.map((p) => {
    const catalogEntry = catalogMap.get(p.productId);
    return {
      productId: p.productId,
      name: catalogEntry?.name || p.productId,
      category: catalogEntry?.category ?? null,
      currentStock: p.availableStock,
      reorderPoint: DEFAULT_REORDER_POINT,
    };
  });

  await upsertInventorySnapshots({ date: today(), inventory });
  logger.log(
    `[live-sync] Inventario sincronizado desde G7: ${inventory.length} producto(s), ${catalogMap.size} con catálogo de G3 (correlationId=${correlationId})`
  );
}

// ────────────────────────────────────────────────
// Fulfillment (G8)
// ────────────────────────────────────────────────
function avgDeliveryDays(shipments) {
  const days = shipments
    .filter((s) => s.status === "DELIVERED" && s.createdAt && s.deliveredAt)
    .map((s) => (new Date(s.deliveredAt) - new Date(s.createdAt)) / 86_400_000);
  if (days.length === 0) return 0;
  return parseFloat((days.reduce((a, b) => a + b, 0) / days.length).toFixed(2));
}

function groupByRegion(shipments) {
  const buckets = new Map();
  for (const s of shipments) {
    // G8 no siempre trae shipTo.region (confirmado con datos reales) — se
    // cae a la ciudad, y si tampoco hay ciudad, a un bucket explícito en
    // vez de perder el envío de las métricas.
    const region = s.shipTo?.region || s.shipTo?.city || "Sin región";
    if (!buckets.has(region)) buckets.set(region, []);
    buckets.get(region).push(s);
  }
  return [...buckets.entries()].map(([region, group]) => ({
    region,
    shipments: group.length,
    avgDays: avgDeliveryDays(group),
    // G8 no expone una fecha/hora prometida de entrega — no hay forma de
    // calcular un onTimeRate real con lo que su contrato expone hoy.
    onTimeRate: null,
  }));
}

async function syncFulfillment(correlationId, logger = console) {
  if (!isDbConfigured()) {
    logger.warn("[live-sync] DATABASE_URL no configurada — se omite syncFulfillment (G8).");
    return;
  }

  const shipments = await fetchAllShipments(correlationId);
  const totalShipments = shipments.length;
  const deliveredCount = shipments.filter((s) => s.status === "DELIVERED").length;

  await upsertFulfillment({
    date: today(),
    fulfillment: {
      fulfillmentRate: totalShipments ? parseFloat((deliveredCount / totalShipments).toFixed(4)) : 0,
      avgDeliveryTimeDays: avgDeliveryDays(shipments),
      // Igual que onTimeRate por región: NUMERIC(5,4) en el schema admite
      // NULL, así que se guarda así en vez de inventar un valor que G8 no
      // puede respaldar (no expone fecha prometida de entrega).
      onTimeDeliveryRate: null,
      totalShipments,
      deliveredCount,
    },
    byRegion: groupByRegion(shipments),
    // G8 no tiene concepto de "carrier" — usan driverId/driverName
    // individuales, no transportistas, así que no hay forma de mapear esto
    // 1:1 a report_fulfillment_by_carrier. Se deja vacío a propósito: el
    // upsert de esa tabla específica no corre desde el sync en vivo (el
    // loop de upsertFulfillment sobre un array vacío es un no-op), así que
    // conserva lo último que haya dejado el batch sintético, en vez de
    // inventar un carrier falso para no ensuciar la tabla con datos que no
    // existen en la fuente real.
    byCarrier: [],
  });

  logger.log(
    `[live-sync] Fulfillment sincronizado desde G8: ${totalShipments} envío(s), ${deliveredCount} entregado(s) (correlationId=${correlationId})`
  );
}

// ────────────────────────────────────────────────
// Orquestación
// ────────────────────────────────────────────────
async function syncAll(logger = console) {
  const correlationId = crypto.randomUUID();

  try {
    await syncInventory(correlationId, logger);
  } catch (err) {
    logger.error(`[live-sync] Error sincronizando inventario (G7, correlationId=${correlationId}): ${err.message}`);
  }

  try {
    await syncFulfillment(correlationId, logger);
  } catch (err) {
    logger.error(`[live-sync] Error sincronizando fulfillment (G8, correlationId=${correlationId}): ${err.message}`);
  }
}

let timer = null;

function start(logger = console) {
  if (!isDbConfigured()) {
    logger.warn(
      "[live-sync] DATABASE_URL no configurada — el sync en vivo de G7/G8 no va a persistir nada hasta que haya DB."
    );
  }
  syncAll(logger);
  timer = setInterval(() => syncAll(logger), SYNC_INTERVAL_MS);
  logger.log(`[live-sync] Iniciado, intervalo=${SYNC_INTERVAL_MS}ms`);
}

function stop() {
  if (timer) clearInterval(timer);
}

module.exports = { start, stop, syncAll, syncInventory, syncFulfillment };
