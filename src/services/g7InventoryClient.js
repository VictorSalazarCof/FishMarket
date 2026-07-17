// ============================================================
// G10 – Cliente de inventario (integración G7)
// ============================================================
// Confirmado en vivo (2026-07-15) contra https://inventario-g7.onrender.com:
//   GET /inventory?page=&size= → { data: [{productId, availableStock,
//     reservedStock, totalStock, virtualStock}], pagination: {page, size,
//     total, totalPages} }
// El header X-Consumer es obligatorio en todas las rutas — sin él, G7
// devuelve 400 { code: "INVALID_REQUEST" } (confirmado con curl).
// G7 NO expone productName/category/reorderPoint — ese dato vive en el
// catálogo de G3 (ver src/services/g3CatalogClient.js). syncInventory en
// liveIntegrationsSync.js cruza ambos por productId/id para enriquecer
// el inventario; reorderPoint sigue en un umbral fijo (G3 tampoco lo
// expone).

const G7_BASE_URL = process.env.G7_INVENTORY_SERVICE_URL || "https://inventario-g7.onrender.com";
const MAX_PAGES = 10; // tope de seguridad para fetchAllInventory, evita loop infinito si pagination viene mal

function g7Headers(correlationId) {
  return {
    "X-Correlation-Id": correlationId,
    "X-Request-Id": correlationId,
    "X-Consumer": "g10-reporteria",
  };
}

async function fetchInventoryPage({ page = 1, size = 50 } = {}, correlationId) {
  const url = `${G7_BASE_URL}/inventory?page=${page}&size=${size}`;
  const response = await fetch(url, { headers: g7Headers(correlationId) });

  if (!response.ok) {
    throw new Error(`G7 respondió ${response.status} al listar inventario (page=${page})`);
  }

  return response.json();
}

async function fetchAllInventory(correlationId) {
  const first = await fetchInventoryPage({ page: 1, size: 50 }, correlationId);
  const items = [...(first.data || [])];
  const totalPages = Math.min(first.pagination?.totalPages || 1, MAX_PAGES);

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchInventoryPage({ page, size: 50 }, correlationId);
    items.push(...(next.data || []));
  }

  return items;
}

module.exports = { fetchInventoryPage, fetchAllInventory };
