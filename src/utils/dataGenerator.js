// ============================================================
// G10 – Generador de datos sintéticos para persistencia
// ============================================================
// Genera un "día" completo de métricas consistentes entre todas
// las tablas. Lo usan scripts/seed.js (carga histórica) y
// src/repositories/batchRepository.js (recalculación on-demand).
// No reemplaza src/data/mockData.js, que sigue siendo el
// fallback en memoria cuando no hay DB configurada.

const PRODUCTS = [
  { productId: "p001", name: "Caña de pesca profesional XL",  category: "cañas",      baseStock: 42, reorderPoint: 15 },
  { productId: "p002", name: "Carrete spinning Pro 3000",      category: "carretes",   baseStock: 28, reorderPoint: 10 },
  { productId: "p003", name: "Set de anzuelos variados x50",   category: "accesorios", baseStock: 7,  reorderPoint: 20 },
  { productId: "p004", name: "Red de pesca 10m nylon",         category: "redes",      baseStock: 6,  reorderPoint: 8  },
  { productId: "p005", name: "Señuelos de silicona pack x10",  category: "señuelos",   baseStock: 55, reorderPoint: 25 },
  { productId: "p006", name: "Chaleco de pesca táctico",       category: "vestuario",  baseStock: 4,  reorderPoint: 10 },
  { productId: "p007", name: "Caja de aparejos premium",       category: "almacenaje", baseStock: 31, reorderPoint: 12 },
  { productId: "p008", name: "Línea monofilamento 0.4mm 100m", category: "líneas",     baseStock: 9,  reorderPoint: 30 },
  { productId: "p009", name: "Flotadores articulados x6",      category: "accesorios", baseStock: 63, reorderPoint: 20 },
  { productId: "p010", name: "Waders de neopreno talla L",     category: "vestuario",  baseStock: 3,  reorderPoint: 5  },
];

const STATUSES = [
  { status: "delivered",  base: 0.629 },
  { status: "processing", base: 0.170 },
  { status: "shipped",    base: 0.120 },
  { status: "pending",    base: 0.056 },
  { status: "cancelled",  base: 0.020 },
  { status: "returned",   base: 0.006 },
];

const REGIONS = [
  { region: "Región Metropolitana", weight: 0.47 },
  { region: "Valparaíso",           weight: 0.20 },
  { region: "Biobío",               weight: 0.17 },
  { region: "Los Lagos",            weight: 0.16 },
];

const CARRIERS = [
  { carrier: "Chilexpress", weight: 0.57 },
  { carrier: "Starken",     weight: 0.29 },
  { carrier: "BlueExpress", weight: 0.14 },
];

const PAYMENT_METHODS = [
  { method: "credit_card",   weight: 0.55 },
  { method: "debit_card",    weight: 0.29 },
  { method: "bank_transfer", weight: 0.12 },
  { method: "paypal",        weight: 0.04 },
];

const COMM_TYPES = [
  { type: "order_confirmation", weight: 0.27, openRate: 0.89, clickRate: 0.21 },
  { type: "shipment_update",    weight: 0.25, openRate: 0.93, clickRate: 0.46 },
  { type: "delivery_confirmed", weight: 0.24, openRate: 0.87, clickRate: 0.12 },
  { type: "low_stock_alert",    weight: 0.15, openRate: 0.54, clickRate: 0.39 },
  { type: "promotional",        weight: 0.09, openRate: 0.31, clickRate: 0.09 },
];

const rand = (min, max) => min + Math.random() * (max - min);
const jitter = (base, pct = 0.1) => base * (1 + rand(-pct, pct));

// Genera un set completo y consistente de métricas para una fecha.
function generateDailyMetrics(dateStr) {
  const date = new Date(dateStr);
  const isWeekend = [0, 6].includes(date.getDay());
  const dayIndex = Math.floor(date.getTime() / 86_400_000);

  const totalOrders = Math.floor((isWeekend ? 18 : 12) + rand(0, 8));
  const avgOrderValue = Math.floor(jitter(8500, 0.25));
  const totalRevenue = totalOrders * avgOrderValue;
  const totalItemsSold = Math.round(totalOrders * 2.6);

  const products = PRODUCTS.map((p) => ({
    productId: p.productId,
    name: p.name,
    category: p.category,
    unitsSold: Math.max(0, Math.floor(jitter(totalItemsSold / PRODUCTS.length, 0.6))),
    revenue: Math.max(0, Math.floor(jitter(totalRevenue / PRODUCTS.length, 0.6))),
  }));

  const statusBreakdown = STATUSES.map((s) => ({
    status: s.status,
    count: Math.max(0, Math.round(totalOrders * jitter(s.base, 0.15))),
    avgProcessingTimeDays: s.status === "cancelled" || s.status === "returned"
      ? null
      : parseFloat(jitter(2, 0.4).toFixed(2)),
  }));

  // Stock decae lentamente con el tiempo y se resetea cíclicamente
  // (simula reposición periódica sin requerir transacciones reales de G3).
  const inventory = PRODUCTS.map((p) => {
    const cycle = dayIndex % 21; // ciclo de reposición ficticio de 3 semanas
    const stock = Math.max(0, Math.round(p.baseStock - cycle * (p.baseStock / 21) + rand(-1, 1)));
    return {
      productId: p.productId,
      name: p.name,
      category: p.category,
      currentStock: stock,
      reorderPoint: p.reorderPoint,
    };
  });

  const totalShipments = Math.round(totalOrders * 0.92);
  const deliveredCount = Math.round(totalShipments * jitter(0.94, 0.05));
  const fulfillment = {
    fulfillmentRate: parseFloat(jitter(0.943, 0.05).toFixed(4)),
    avgDeliveryTimeDays: parseFloat(jitter(3.2, 0.2).toFixed(2)),
    onTimeDeliveryRate: parseFloat(jitter(0.876, 0.06).toFixed(4)),
    totalShipments,
    deliveredCount,
  };

  const byRegion = REGIONS.map((r) => ({
    region: r.region,
    shipments: Math.round(totalShipments * jitter(r.weight, 0.1)),
    avgDays: parseFloat(jitter(2.8, 0.25).toFixed(2)),
    onTimeRate: parseFloat(jitter(0.87, 0.08).toFixed(4)),
  }));

  const byCarrier = CARRIERS.map((c) => ({
    carrier: c.carrier,
    shipments: Math.round(totalShipments * jitter(c.weight, 0.1)),
    avgDays: parseFloat(jitter(3.2, 0.25).toFixed(2)),
    onTimeRate: parseFloat(jitter(0.86, 0.08).toFixed(4)),
  }));

  const totalTransactions = Math.round(totalOrders * jitter(1.0, 0.05));
  const payments = PAYMENT_METHODS.map((m) => {
    const count = Math.max(0, Math.round(totalTransactions * jitter(m.weight, 0.1)));
    const successCount = Math.round(count * jitter(0.967, 0.02));
    return {
      method: m.method,
      count,
      amount: Math.floor(count * jitter(avgOrderValue, 0.15)),
      successCount,
    };
  });

  const totalCommsSent = Math.round(totalOrders * jitter(3.6, 0.15));
  const communications = COMM_TYPES.map((c) => {
    const sent = Math.max(0, Math.round(totalCommsSent * jitter(c.weight, 0.1)));
    const openRate = parseFloat(jitter(c.openRate, 0.06).toFixed(4));
    return {
      type: c.type,
      totalSent: sent,
      totalOpened: Math.round(sent * openRate),
      openRate,
      clickRate: parseFloat(jitter(c.clickRate, 0.1).toFixed(4)),
    };
  });

  return {
    date: dateStr,
    sales: { totalOrders, totalRevenue, avgOrderValue, totalItemsSold },
    products,
    statusBreakdown,
    inventory,
    fulfillment,
    byRegion,
    byCarrier,
    payments,
    communications,
  };
}

module.exports = { PRODUCTS, generateDailyMetrics };
