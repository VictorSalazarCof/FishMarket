// ============================================================
// G10 - Reportería / Batch / Streaming
// Mock Data — FishMarket Cloud
// ============================================================

const PRODUCTS = [
  { productId: "p001", name: "Caña de pesca profesional XL",  category: "cañas",       currentStock: 42, reorderPoint: 15 },
  { productId: "p002", name: "Carrete spinning Pro 3000",      category: "carretes",    currentStock: 28, reorderPoint: 10 },
  { productId: "p003", name: "Set de anzuelos variados x50",   category: "accesorios",  currentStock: 7,  reorderPoint: 20 },
  { productId: "p004", name: "Red de pesca 10m nylon",         category: "redes",       currentStock: 6,  reorderPoint: 8  },
  { productId: "p005", name: "Señuelos de silicona pack x10",  category: "señuelos",    currentStock: 55, reorderPoint: 25 },
  { productId: "p006", name: "Chaleco de pesca táctico",       category: "vestuario",   currentStock: 4,  reorderPoint: 10 },
  { productId: "p007", name: "Caja de aparejos premium",       category: "almacenaje",  currentStock: 31, reorderPoint: 12 },
  { productId: "p008", name: "Línea monofilamento 0.4mm 100m", category: "líneas",      currentStock: 9,  reorderPoint: 30 },
  { productId: "p009", name: "Flotadores articulados x6",      category: "accesorios",  currentStock: 63, reorderPoint: 20 },
  { productId: "p010", name: "Waders de neopreno talla L",     category: "vestuario",   currentStock: 3,  reorderPoint: 5  },
];

function generateDailySeries(startDate, endDate) {
  const series = [];
  const start = new Date(startDate || "2025-01-01");
  const end   = new Date(endDate   || "2025-01-31");
  let current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseOrders = isWeekend ? 18 : 12;
    const orders  = Math.floor(baseOrders + Math.random() * 8);
    const avgVal  = 7500 + Math.floor(Math.random() * 3000);

    series.push({
      date:          current.toISOString().split("T")[0],
      orders,
      revenue:       orders * avgVal,
      avgOrderValue: avgVal,
    });

    current.setDate(current.getDate() + 1);
  }
  return series;
}

// Agrupa la serie diaria en buckets semanales/mensuales sumando orders y revenue,
// en vez de solo muestrear un día cada N. Así "week"/"month" reflejan totales reales.
function aggregateSeries(dailySeries, groupBy) {
  if (groupBy === "day") return dailySeries;

  const buckets = new Map();
  dailySeries.forEach(d => {
    const dateObj = new Date(d.date);
    let key;
    if (groupBy === "week") {
      const day = dateObj.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(dateObj);
      monday.setDate(dateObj.getDate() + diffToMonday);
      key = monday.toISOString().split("T")[0]; // fecha del lunes de esa semana
    } else {
      key = d.date.slice(0, 7); // "YYYY-MM"
    }
    if (!buckets.has(key)) buckets.set(key, { date: key, orders: 0, revenue: 0 });
    const bucket = buckets.get(key);
    bucket.orders  += d.orders;
    bucket.revenue += d.revenue;
  });

  return Array.from(buckets.values()).map(b => ({
    ...b,
    avgOrderValue: b.orders ? Math.round(b.revenue / b.orders) : 0,
  }));
}

function generateTimeSeries(startDate, endDate, groupBy = "day") {
  return aggregateSeries(generateDailySeries(startDate, endDate), groupBy);
}

// ────────────────────────────────────────────────
// 1. GET /reports/sales-summary
// ────────────────────────────────────────────────
function getSalesSummary({ startDate, endDate, groupBy = "day" }) {
  const timeSeries = generateTimeSeries(startDate, endDate, groupBy);
  const totalOrders  = timeSeries.reduce((s, d) => s + d.orders,  0);
  const totalRevenue = timeSeries.reduce((s, d) => s + d.revenue, 0);

  return {
    source: "mock",
    period: { startDate: startDate || "2025-01-01", endDate: endDate || "2025-01-31", groupBy },
    summary: {
      currency: "CLP",
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
      totalItemsSold:    Math.round(totalOrders * 2.6),
    },
    timeSeries,
  };
}

// ────────────────────────────────────────────────
// 2. GET /reports/products
// ────────────────────────────────────────────────
function getProductBreakdown({ startDate, endDate, limit = 10 }) {
  const topProducts = PRODUCTS
    .map(p => ({
      productId:  p.productId,
      name:       p.name,
      category:   p.category,
      unitsSold:  Math.floor(20 + Math.random() * 80),
      revenue:    Math.floor(150000 + Math.random() * 600000),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, Number(limit));

  return {
    source: "mock",
    currency: "CLP",
    period:      { startDate: startDate || "2025-01-01", endDate: endDate || "2025-01-31" },
    topProducts,
    totalProducts: PRODUCTS.length,
  };
}

// ────────────────────────────────────────────────
// 3. GET /reports/status
// TODO: reemplazar por datos reales desde tablas de G5 (Orders) vía Supabase Realtime
// ────────────────────────────────────────────────
function getStatusBreakdown({ startDate, endDate }) {
  const statusBreakdown = [
    { status: "delivered",   count: 215, percentage: 62.9, avgProcessingTimeDays: 2.3 },
    { status: "processing",  count: 58,  percentage: 17.0, avgProcessingTimeDays: 1.1 },
    { status: "shipped",     count: 41,  percentage: 12.0, avgProcessingTimeDays: 0.8 },
    { status: "pending",     count: 19,  percentage: 5.6,  avgProcessingTimeDays: 0.2 },
    { status: "cancelled",   count: 7,   percentage: 2.0,  avgProcessingTimeDays: null },
    { status: "returned",    count: 2,   percentage: 0.6,  avgProcessingTimeDays: null },
  ];
  const totalOrders = statusBreakdown.reduce((s, r) => s + r.count, 0);
  return {
    source: "mock",
    period: { startDate: startDate || "2025-01-01", endDate: endDate || "2025-01-31" },
    totalOrders,
    statusBreakdown,
  };
}

// ────────────────────────────────────────────────
// 4. GET /inventory/low-stock
// TODO: reemplazar por datos reales desde tablas de Inventario vía Supabase Realtime
// ────────────────────────────────────────────────
function getLowStock({ threshold = 10 }) {
  const thresh = Number(threshold);
  const products = PRODUCTS
    .filter(p => p.currentStock < thresh)
    .map(p => ({
      productId:    p.productId,
      name:         p.name,
      category:     p.category,
      currentStock: p.currentStock,
      reorderPoint: p.reorderPoint,
      urgency:      p.currentStock <= 3 ? "critical" : p.currentStock <= 6 ? "high" : "medium",
    }));

  return {
    source: "mock",
    threshold:     thresh,
    totalProducts: products.length,
    products,
    generatedAt:   new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────
// 5. GET /reports/fulfillment
// TODO: reemplazar por datos reales desde tablas de G8 (Shipment) vía Supabase Realtime
// ────────────────────────────────────────────────
function getFulfillment({ startDate, endDate }) {
  return {
    source: "mock",
    period: { startDate: startDate || "2025-01-01", endDate: endDate || "2025-01-31" },
    metrics: {
      fulfillmentRate:       0.943,
      avgDeliveryTimeDays:   3.2,
      onTimeDeliveryRate:    0.876,
      totalShipments:        314,
      deliveredCount:        296,
    },
    byRegion: [
      { region: "Región Metropolitana", shipments: 148, avgDays: 1.8, onTimeRate: 0.932 },
      { region: "Valparaíso",           shipments: 62,  avgDays: 2.4, onTimeRate: 0.887 },
      { region: "Biobío",               shipments: 54,  avgDays: 3.1, onTimeRate: 0.852 },
      { region: "Los Lagos",            shipments: 50,  avgDays: 4.7, onTimeRate: 0.780 },
    ],
    byCarrier: [
      { carrier: "Chilexpress", shipments: 180, avgDays: 2.9, onTimeRate: 0.901 },
      { carrier: "Starken",     shipments: 90,  avgDays: 3.4, onTimeRate: 0.856 },
      { carrier: "BlueExpress", shipments: 44,  avgDays: 3.8, onTimeRate: 0.818 },
    ],
  };
}

// ────────────────────────────────────────────────
// 6. GET /reports/communications
// TODO: reemplazar por datos reales consumiendo GET /notifications/stats de G9 (Notifications)
// ────────────────────────────────────────────────
function getCommunications({ startDate, endDate }) {
  return {
    source: "mock",
    period: { startDate: startDate || "2025-01-01", endDate: endDate || "2025-01-31" },
    summary: {
      totalSent: 1247,
      totalOpened: 893,
      globalOpenRate: 0.716,
    },
    byType: [
      { type: "order_confirmation", count: 342, openRate: 0.891, clickRate: 0.210 },
      { type: "shipment_update",    count: 314, openRate: 0.934, clickRate: 0.456 },
      { type: "delivery_confirmed", count: 296, openRate: 0.867, clickRate: 0.123 },
      { type: "low_stock_alert",    count: 185, openRate: 0.541, clickRate: 0.387 },
      { type: "promotional",        count: 110, openRate: 0.312, clickRate: 0.089 },
    ],
  };
}

// ────────────────────────────────────────────────
// 7. GET /reports/order-trends
// ────────────────────────────────────────────────
function getOrderTrends({ startDate, endDate, interval = "day" }) {
  const timeSeries = generateTimeSeries(startDate, endDate, interval);
  const revenues   = timeSeries.map(d => d.revenue);
  const first  = revenues.slice(0, Math.floor(revenues.length / 2));
  const second = revenues.slice(Math.floor(revenues.length / 2));
  const avgFirst  = first.reduce((a, b) => a + b, 0)  / (first.length  || 1);
  const avgSecond = second.reduce((a, b) => a + b, 0) / (second.length || 1);

  return {
    source: "mock",
    period: { startDate: startDate || "2025-01-01", endDate: endDate || "2025-01-31", interval },
    trends: timeSeries,
    insights: {
      peakDay:      "Sábado",
      peakHour:     "19:00–21:00",
      growthRate:   parseFloat(((avgSecond - avgFirst) / (avgFirst || 1)).toFixed(4)),
      totalOrders:  timeSeries.reduce((s, d) => s + d.orders,  0),
      totalRevenue: timeSeries.reduce((s, d) => s + d.revenue, 0),
    },
  };
}

// ────────────────────────────────────────────────
// 8. GET /reports/payment-summary
// TODO: reemplazar por datos reales desde tablas del grupo de Pagos vía Supabase Realtime
// ────────────────────────────────────────────────
function getPaymentSummary({ startDate, endDate }) {
  const byMethod = [
    { method: "credit_card",    count: 189, amount: 1680000, successCount: 185 },
    { method: "debit_card",     count: 98,  amount: 612500,  successCount: 96  },
    { method: "bank_transfer",  count: 42,  amount: 378000,  successCount: 40  },
    { method: "paypal",         count: 13,  amount: 97000,   successCount: 13  },
  ];
  const totalTransactions = byMethod.reduce((s, m) => s + m.count, 0);
  byMethod.forEach(m => {
    m.successRate = parseFloat((m.successCount / m.count).toFixed(4));
    m.percentage  = parseFloat((m.count / totalTransactions * 100).toFixed(1));
  });
  const totalAmount = byMethod.reduce((s, m) => s + m.amount, 0);

  return {
    source: "mock",
    currency: "CLP",
    period: { startDate: startDate || "2025-01-01", endDate: endDate || "2025-01-31" },
    summary: {
      totalAmount,
      totalTransactions,
      successRate:        0.967,
    },
    byMethod,
  };
}

// ────────────────────────────────────────────────
// 9. POST /batch/recalculate
// ────────────────────────────────────────────────
function triggerBatchRecalculate({ targetDate, scope = "daily" }) {
  const now   = new Date();
  const jobId = `batch_${(targetDate || now.toISOString().split("T")[0]).replace(/-/g, "")}_${now.getTime().toString().slice(-6)}`;
  const eta   = new Date(now.getTime() + 3 * 60 * 1000); // +3 min

  return {
    source:                   "mock",
    jobId,
    status:                  "queued",
    targetDate:              targetDate || now.toISOString().split("T")[0],
    scope,
    estimatedCompletionTime: eta.toISOString(),
    queuedAt:                now.toISOString(),
    message:                 `Batch recalculation job queued successfully for scope '${scope}'.`,
  };
}

module.exports = {
  getSalesSummary,
  getProductBreakdown,
  getStatusBreakdown,
  getLowStock,
  getFulfillment,
  getCommunications,
  getOrderTrends,
  getPaymentSummary,
  triggerBatchRecalculate,
};
