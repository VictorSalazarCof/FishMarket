// ============================================================
// G10 – Cliente de catálogo (integración G3)
// ============================================================
// Confirmado en vivo (2026-07-17) contra https://catalog-api-cm1l.onrender.com/api/v1:
//   GET /products?page=&size= → { data: [{id, name, description, price,
//     categoryId, stockVisible, imageUrl, isActive}], meta: {currentPage,
//     pageSize, totalElements, totalPages} }
//   GET /categories → { data: [{id, name, description}] }
// Los mismos 3 headers son obligatorios en ambas rutas — sin ellos, G3
// devuelve 400 { code: "MISSING_HEADERS" } (igual que G7, confirmado con
// curl). El parámetro de paginación es `size` — `pageSize` se ignora
// silenciosamente y cae al default de 20.
// El `id` de un producto en G3 coincide exactamente con el `productId`
// que expone G7 (confirmado cruzando datos reales de ambos servicios en
// vivo) — es la clave para enriquecer el inventario de G7 con nombre y
// categoría real en vez de aproximar con productId/null.

const G3_BASE_URL = process.env.G3_CATALOG_SERVICE_URL || "https://catalog-api-cm1l.onrender.com/api/v1";
const MAX_PAGES = 10; // tope de seguridad para fetchAllProducts, mismo criterio que g7InventoryClient.js

function g3Headers(correlationId) {
  return {
    "X-Correlation-Id": correlationId,
    "X-Request-Id": correlationId,
    "X-Consumer": "g10-reporteria",
  };
}

async function fetchProductsPage({ page = 1, size = 50 } = {}, correlationId) {
  const url = `${G3_BASE_URL}/products?page=${page}&size=${size}`;
  const response = await fetch(url, { headers: g3Headers(correlationId) });

  if (!response.ok) {
    throw new Error(`G3 respondió ${response.status} al listar productos (page=${page})`);
  }

  return response.json();
}

async function fetchAllProducts(correlationId) {
  const first = await fetchProductsPage({ page: 1, size: 50 }, correlationId);
  const items = [...(first.data || [])];
  const totalPages = Math.min(first.meta?.totalPages || 1, MAX_PAGES);

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchProductsPage({ page, size: 50 }, correlationId);
    items.push(...(next.data || []));
  }

  return items;
}

async function fetchCategories(correlationId) {
  const url = `${G3_BASE_URL}/categories`;
  const response = await fetch(url, { headers: g3Headers(correlationId) });

  if (!response.ok) {
    throw new Error(`G3 respondió ${response.status} al listar categorías`);
  }

  const body = await response.json();
  return body.data || [];
}

// Combina productos + categorías en un Map productId -> {name, category},
// listo para que liveIntegrationsSync.js enriquezca el inventario de G7.
async function fetchCatalogMap(correlationId) {
  const [products, categories] = await Promise.all([
    fetchAllProducts(correlationId),
    fetchCategories(correlationId),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const map = new Map();
  for (const p of products) {
    map.set(p.id, {
      name: p.name,
      category: categoryNameById.get(p.categoryId) || null,
    });
  }
  return map;
}

module.exports = { fetchProductsPage, fetchAllProducts, fetchCategories, fetchCatalogMap };
