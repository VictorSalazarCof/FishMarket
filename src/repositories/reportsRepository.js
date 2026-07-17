// ============================================================
// G10 – Repositorio de lectura (reportes consolidados)
// ============================================================
// Cada función refleja exactamente la forma de respuesta que ya
// usan los routers (misma que mockData.js), pero leyendo desde
// Postgres. Si no hay filas para el rango pedido, devuelve series
// vacías en vez de fallar — el caller decide si hace fallback.

const { query } = require("../db/pool");

const DEFAULT_START = "2025-01-01";
const DEFAULT_END   = "2025-01-31";

function bucketByPeriod(rows, groupBy) {
  if (groupBy !== "week" && groupBy !== "month") {
    return rows.map((r) => ({
      date: r.report_date.toISOString().split("T")[0],
      orders: Number(r.total_orders),
      revenue: Number(r.total_revenue),
      avgOrderValue: Number(r.avg_order_value),
    }));
  }

  const buckets = new Map();
  for (const r of rows) {
    const d = new Date(r.report_date);
    let key;
    if (groupBy === "week") {
      const onejan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d - onejan) / 86_400_000 + onejan.getDay() + 1) / 7);
      key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    if (!buckets.has(key)) buckets.set(key, { date: key, orders: 0, revenue: 0 });
    const b = buckets.get(key);
    b.orders += Number(r.total_orders);
    b.revenue += Number(r.total_revenue);
  }
  return [...buckets.values()].map((b) => ({
    ...b,
    avgOrderValue: b.orders ? Math.round(b.revenue / b.orders) : 0,
  }));
}

async function getSalesSummary({ startDate, endDate, groupBy = "day" }) {
  const start = startDate || DEFAULT_START;
  const end = endDate || DEFAULT_END;
  const { rows } = await query(
    `SELECT report_date, total_revenue, total_orders, avg_order_value
     FROM report_sales_daily
     WHERE report_date BETWEEN $1 AND $2
     ORDER BY report_date ASC`,
    [start, end]
  );

  const timeSeries = bucketByPeriod(rows, groupBy);
  const totalOrders = timeSeries.reduce((s, d) => s + d.orders, 0);
  const totalRevenue = timeSeries.reduce((s, d) => s + d.revenue, 0);

  return {
    period: { startDate: start, endDate: end, groupBy },
    summary: {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
      totalItemsSold: Math.round(totalOrders * 2.6),
    },
    timeSeries,
    source: "db",
  };
}

async function getProductBreakdown({ startDate, endDate, limit = 10 }) {
  const start = startDate || DEFAULT_START;
  const end = endDate || DEFAULT_END;
  const { rows } = await query(
    `SELECT product_id, product_name, category, SUM(units_sold) AS units_sold, SUM(revenue) AS revenue
     FROM report_product_metrics
     WHERE report_date BETWEEN $1 AND $2
     GROUP BY product_id, product_name, category
     ORDER BY revenue DESC
     LIMIT $3`,
    [start, end, Number(limit)]
  );

  return {
    period: { startDate: start, endDate: end },
    topProducts: rows.map((r) => ({
      productId: r.product_id,
      name: r.product_name,
      category: r.category,
      unitsSold: Number(r.units_sold),
      revenue: Number(r.revenue),
    })),
    totalProducts: rows.length,
    source: "db",
  };
}

async function getStatusBreakdown({ startDate, endDate }) {
  const start = startDate || DEFAULT_START;
  const end = endDate || DEFAULT_END;
  const { rows } = await query(
    `SELECT status, SUM(order_count) AS count, AVG(avg_processing_time_days) AS avg_processing_time_days
     FROM report_order_status
     WHERE report_date BETWEEN $1 AND $2
     GROUP BY status
     ORDER BY count DESC`,
    [start, end]
  );

  const totalOrders = rows.reduce((s, r) => s + Number(r.count), 0) || 1;
  return {
    period: { startDate: start, endDate: end },
    totalOrders,
    statusBreakdown: rows.map((r) => ({
      status: r.status,
      count: Number(r.count),
      percentage: parseFloat(((Number(r.count) / totalOrders) * 100).toFixed(1)),
      avgProcessingTimeDays: r.avg_processing_time_days !== null
        ? parseFloat(Number(r.avg_processing_time_days).toFixed(2))
        : null,
    })),
    source: "db",
  };
}

async function getLowStock({ threshold = 10 }) {
  const thresh = Number(threshold);
  const { rows } = await query(
    `WITH latest AS (SELECT MAX(snapshot_date) AS d FROM report_inventory_snapshots)
     SELECT s.product_id, s.product_name, s.category, s.current_stock, s.reorder_point
     FROM report_inventory_snapshots s, latest
     WHERE s.snapshot_date = latest.d AND s.current_stock < $1
     ORDER BY s.current_stock ASC`,
    [thresh]
  );

  const products = rows.map((r) => ({
    productId: r.product_id,
    name: r.product_name,
    category: r.category,
    currentStock: Number(r.current_stock),
    reorderPoint: Number(r.reorder_point),
    urgency: r.current_stock <= 3 ? "critical" : r.current_stock <= 6 ? "high" : "medium",
  }));

  return {
    threshold: thresh,
    totalProducts: products.length,
    products,
    generatedAt: new Date().toISOString(),
    source: "db",
  };
}

async function getFulfillment({ startDate, endDate }) {
  const start = startDate || DEFAULT_START;
  const end = endDate || DEFAULT_END;

  const agg = await query(
    `SELECT AVG(fulfillment_rate) AS fulfillment_rate, AVG(avg_delivery_time_days) AS avg_delivery_time_days,
            AVG(on_time_delivery_rate) AS on_time_delivery_rate, SUM(total_shipments) AS total_shipments,
            SUM(delivered_count) AS delivered_count
     FROM report_fulfillment_metrics
     WHERE report_date BETWEEN $1 AND $2`,
    [start, end]
  );
  const region = await query(
    `SELECT region, SUM(shipments) AS shipments, AVG(avg_days) AS avg_days, AVG(on_time_rate) AS on_time_rate
     FROM report_fulfillment_by_region
     WHERE report_date BETWEEN $1 AND $2
     GROUP BY region ORDER BY shipments DESC`,
    [start, end]
  );
  const carrier = await query(
    `SELECT carrier, SUM(shipments) AS shipments, AVG(avg_days) AS avg_days, AVG(on_time_rate) AS on_time_rate
     FROM report_fulfillment_by_carrier
     WHERE report_date BETWEEN $1 AND $2
     GROUP BY carrier ORDER BY shipments DESC`,
    [start, end]
  );

  const a = agg.rows[0] || {};
  return {
    period: { startDate: start, endDate: end },
    metrics: {
      fulfillmentRate: a.fulfillment_rate !== null ? parseFloat(Number(a.fulfillment_rate).toFixed(4)) : 0,
      avgDeliveryTimeDays: a.avg_delivery_time_days !== null ? parseFloat(Number(a.avg_delivery_time_days).toFixed(2)) : 0,
      onTimeDeliveryRate: a.on_time_delivery_rate !== null ? parseFloat(Number(a.on_time_delivery_rate).toFixed(4)) : 0,
      totalShipments: Number(a.total_shipments) || 0,
      deliveredCount: Number(a.delivered_count) || 0,
    },
    byRegion: region.rows.map((r) => ({
      region: r.region,
      shipments: Number(r.shipments),
      avgDays: parseFloat(Number(r.avg_days).toFixed(2)),
      onTimeRate: parseFloat(Number(r.on_time_rate).toFixed(4)),
    })),
    byCarrier: carrier.rows.map((r) => ({
      carrier: r.carrier,
      shipments: Number(r.shipments),
      avgDays: parseFloat(Number(r.avg_days).toFixed(2)),
      onTimeRate: parseFloat(Number(r.on_time_rate).toFixed(4)),
    })),
    source: "db",
  };
}

async function getCommunications({ startDate, endDate }) {
  const start = startDate || DEFAULT_START;
  const end = endDate || DEFAULT_END;
  const { rows } = await query(
    `SELECT comm_type, SUM(total_sent) AS total_sent, SUM(total_opened) AS total_opened,
            AVG(open_rate) AS open_rate, AVG(click_rate) AS click_rate
     FROM report_communications_summary
     WHERE report_date BETWEEN $1 AND $2
     GROUP BY comm_type ORDER BY total_sent DESC`,
    [start, end]
  );

  const totalSent = rows.reduce((s, r) => s + Number(r.total_sent), 0);
  const totalOpened = rows.reduce((s, r) => s + Number(r.total_opened), 0);

  return {
    period: { startDate: start, endDate: end },
    summary: {
      totalSent,
      totalOpened,
      globalOpenRate: totalSent ? parseFloat((totalOpened / totalSent).toFixed(4)) : 0,
    },
    byType: rows.map((r) => ({
      type: r.comm_type,
      count: Number(r.total_sent),
      openRate: parseFloat(Number(r.open_rate).toFixed(4)),
      clickRate: parseFloat(Number(r.click_rate).toFixed(4)),
    })),
    source: "db",
  };
}

async function getOrderTrends({ startDate, endDate, interval = "day" }) {
  const start = startDate || DEFAULT_START;
  const end = endDate || DEFAULT_END;
  const { rows } = await query(
    `SELECT report_date, total_revenue, total_orders, avg_order_value
     FROM report_sales_daily
     WHERE report_date BETWEEN $1 AND $2
     ORDER BY report_date ASC`,
    [start, end]
  );

  const timeSeries = bucketByPeriod(rows, interval);
  const revenues = timeSeries.map((d) => d.revenue);
  const half = Math.floor(revenues.length / 2);
  const first = revenues.slice(0, half);
  const second = revenues.slice(half);
  const avgFirst = first.length ? first.reduce((a, b) => a + b, 0) / first.length : 0;
  const avgSecond = second.length ? second.reduce((a, b) => a + b, 0) / second.length : 0;
  // Con menos de un punto en cada mitad (ej. un solo día seleccionado como
  // rango) no hay comparación antes/después posible. Antes esto dividía
  // por un promedio vacío (0, con fallback a 1) y "growthRate" terminaba
  // siendo el revenue crudo del día, mostrado como un % absurdo en el
  // dashboard (ej. "9000000.0%"). null es explícito: "no hay suficientes
  // datos para calcular una tendencia", algo distinto de "0% de crecimiento".
  const growthRate = first.length > 0 && second.length > 0
    ? parseFloat(((avgSecond - avgFirst) / (avgFirst || 1)).toFixed(4))
    : null;

  // peakDay calculado de verdad a partir de los datos; peakHour
  // queda fijo porque el schema no registra granularidad horaria.
  const byWeekday = {};
  for (const r of rows) {
    const day = new Date(r.report_date).toLocaleDateString("es-CL", { weekday: "long" });
    byWeekday[day] = (byWeekday[day] || 0) + Number(r.total_revenue);
  }
  const peakDay = Object.entries(byWeekday).sort((a, b) => b[1] - a[1])[0]?.[0] || "Sábado";

  return {
    period: { startDate: start, endDate: end, interval },
    trends: timeSeries,
    insights: {
      peakDay,
      peakHour: "19:00–21:00",
      growthRate,
      totalOrders: timeSeries.reduce((s, d) => s + d.orders, 0),
      totalRevenue: timeSeries.reduce((s, d) => s + d.revenue, 0),
    },
    source: "db",
  };
}

async function getPaymentSummary({ startDate, endDate }) {
  const start = startDate || DEFAULT_START;
  const end = endDate || DEFAULT_END;
  const { rows } = await query(
    `SELECT payment_method, SUM(transaction_count) AS count, SUM(total_amount) AS amount, SUM(success_count) AS success_count
     FROM report_payment_summaries
     WHERE report_date BETWEEN $1 AND $2
     GROUP BY payment_method ORDER BY amount DESC`,
    [start, end]
  );

  const totalTransactions = rows.reduce((s, r) => s + Number(r.count), 0) || 1;
  const byMethod = rows.map((r) => ({
    method: r.payment_method,
    count: Number(r.count),
    amount: Number(r.amount),
    successCount: Number(r.success_count),
    successRate: parseFloat((Number(r.success_count) / (Number(r.count) || 1)).toFixed(4)),
    percentage: parseFloat(((Number(r.count) / totalTransactions) * 100).toFixed(1)),
  }));
  const totalAmount = byMethod.reduce((s, m) => s + m.amount, 0);
  const totalSuccess = byMethod.reduce((s, m) => s + m.successCount, 0);

  return {
    period: { startDate: start, endDate: end },
    summary: {
      totalAmount,
      totalTransactions,
      successRate: parseFloat((totalSuccess / totalTransactions).toFixed(4)),
    },
    byMethod,
    source: "db",
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
};
