// ============================================================
// G10 – Cliente de catálogo (integración G3)
// ============================================================
// Confirmado en vivo (2026-07-16) contra
// https://catalog-api-cm1l.onrender.com/api/v1:
//   GET /products?page=&size=&includeInactive= → { data: [{id, name,
//     description, price, categoryId, stockVisible, imageUrl, isActive}],
//     meta: {currentPage, pageSize, totalElements, totalPages} }
//   GET /categories → { data: [{id, name, description}] } (sin paginar)
// A diferencia de G7/G8, acá los TRES headers son obligatorios — sin
// cualquiera de ellos, G3 devuelve 400 { code: "MISSING_HEADERS" }
// (confirmado con curl).
//
// Se usa solo para resolver nombre/categoría del reporte de inventario —
// el stock sigue siendo exclusivamente de G7 (ver liveIntegrationsSync.js).
//
// Supuesto sin verificar del todo: que el `id` de G3 coincide con el
// `productId` que entrega G7. Un sample manual sí matcheó (mismo UUID visto
// en ambos), pero eso no es garantía sobre el catálogo completo — por eso
// liveIntegrationsSync.js loguea un resumen de matched/sin-match en cada
// ciclo en vez de asumir que el cruce funciona.

const G3_BASE_URL = process.env.G3_CATALOG_SERVICE_URL || "https://catalog-api-cm1l.onrender.com/api/v1";
const MAX_PAGES = 10; // tope de seguridad para fetchAllProducts, evita loop infinito si meta viene mal

function g3Headers(correlationId) {
  return {
    "X-Request-Id": correlationId,
    "X-Correlation-Id": correlationId,
    "X-Consumer": "g10-reporteria",
  };
}

async function fetchProductsPage({ page = 1, size = 50, includeInactive = true } = {}, correlationId) {
  const url = `${G3_BASE_URL}/products?page=${page}&size=${size}&includeInactive=${includeInactive}`;
  const response = await fetch(url, { headers: g3Headers(correlationId) });

  if (!response.ok) {
    throw new Error(`G3 respondió ${response.status} al listar productos (page=${page})`);
  }

  return response.json();
}

async function fetchAllProducts(correlationId) {
  const first = await fetchProductsPage({ page: 1, size: 50, includeInactive: true }, correlationId);
  const items = [...(first.data || [])];
  const totalPages = Math.min(first.meta?.totalPages || 1, MAX_PAGES);

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchProductsPage({ page, size: 50, includeInactive: true }, correlationId);
    items.push(...(next.data || []));
  }

  return items;
}

async function fetchCategories(correlationId) {
  const response = await fetch(`${G3_BASE_URL}/categories`, { headers: g3Headers(correlationId) });

  if (!response.ok) {
    throw new Error(`G3 respondió ${response.status} al listar categorías`);
  }

  const body = await response.json();
  return body.data || [];
}

// Devuelve Map<productId, { name, category }>. Si el categoryId de un
// producto no aparece en /categories, category queda null en vez de
// romper el cruce completo por una categoría huérfana.
async function fetchCatalogMap(correlationId) {
  const [products, categories] = await Promise.all([
    fetchAllProducts(correlationId),
    fetchCategories(correlationId),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const catalogMap = new Map();
  for (const p of products) {
    catalogMap.set(p.id, {
      name: p.name,
      category: categoryNameById.get(p.categoryId) || null,
    });
  }
  return catalogMap;
}

module.exports = { fetchProductsPage, fetchAllProducts, fetchCategories, fetchCatalogMap };
