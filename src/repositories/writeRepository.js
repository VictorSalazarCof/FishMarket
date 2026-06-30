// ============================================================
// G10 – Repositorio de escritura
// ============================================================
// Recibe el objeto que arma dataGenerator.generateDailyMetrics()
// y lo persiste en Supabase con UPSERT (ON CONFLICT) por fecha,
// para que recalcular un día ya existente sea idempotente.

const { query } = require("../db/pool");

async function upsertSalesDaily(m) {
  await query(
    `INSERT INTO report_sales_daily
       (report_date, total_revenue, total_orders, avg_order_value, total_items_sold, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (report_date) DO UPDATE SET
       total_revenue = EXCLUDED.total_revenue,
       total_orders = EXCLUDED.total_orders,
       avg_order_value = EXCLUDED.avg_order_value,
       total_items_sold = EXCLUDED.total_items_sold,
       updated_at = NOW()`,
    [m.date, m.sales.totalRevenue, m.sales.totalOrders, m.sales.avgOrderValue, m.sales.totalItemsSold]
  );
}

async function upsertProductMetrics(m) {
  for (const p of m.products) {
    await query(
      `INSERT INTO report_product_metrics
         (report_date, product_id, product_name, category, units_sold, revenue)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (report_date, product_id) DO UPDATE SET
         units_sold = EXCLUDED.units_sold,
         revenue = EXCLUDED.revenue`,
      [m.date, p.productId, p.name, p.category, p.unitsSold, p.revenue]
    );
  }
}

async function upsertOrderStatus(m) {
  const total = m.statusBreakdown.reduce((s, r) => s + r.count, 0) || 1;
  for (const s of m.statusBreakdown) {
    await query(
      `INSERT INTO report_order_status
         (report_date, status, order_count, percentage, avg_processing_time_days)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (report_date, status) DO UPDATE SET
         order_count = EXCLUDED.order_count,
         percentage = EXCLUDED.percentage,
         avg_processing_time_days = EXCLUDED.avg_processing_time_days`,
      [m.date, s.status, s.count, parseFloat(((s.count / total) * 100).toFixed(2)), s.avgProcessingTimeDays]
    );
  }
}

async function upsertInventorySnapshots(m) {
  for (const p of m.inventory) {
    const isLow = p.currentStock < p.reorderPoint;
    await query(
      `INSERT INTO report_inventory_snapshots
         (snapshot_date, product_id, product_name, category, current_stock, reorder_point, is_low_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (snapshot_date, product_id) DO UPDATE SET
         current_stock = EXCLUDED.current_stock,
         is_low_stock = EXCLUDED.is_low_stock`,
      [m.date, p.productId, p.name, p.category, p.currentStock, p.reorderPoint, isLow]
    );
  }
}

async function upsertFulfillment(m) {
  await query(
    `INSERT INTO report_fulfillment_metrics
       (report_date, fulfillment_rate, avg_delivery_time_days, on_time_delivery_rate, total_shipments, delivered_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (report_date) DO UPDATE SET
       fulfillment_rate = EXCLUDED.fulfillment_rate,
       avg_delivery_time_days = EXCLUDED.avg_delivery_time_days,
       on_time_delivery_rate = EXCLUDED.on_time_delivery_rate,
       total_shipments = EXCLUDED.total_shipments,
       delivered_count = EXCLUDED.delivered_count`,
    [m.date, m.fulfillment.fulfillmentRate, m.fulfillment.avgDeliveryTimeDays,
     m.fulfillment.onTimeDeliveryRate, m.fulfillment.totalShipments, m.fulfillment.deliveredCount]
  );

  for (const r of m.byRegion) {
    await query(
      `INSERT INTO report_fulfillment_by_region (report_date, region, shipments, avg_days, on_time_rate)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (report_date, region) DO UPDATE SET
         shipments = EXCLUDED.shipments, avg_days = EXCLUDED.avg_days, on_time_rate = EXCLUDED.on_time_rate`,
      [m.date, r.region, r.shipments, r.avgDays, r.onTimeRate]
    );
  }

  for (const c of m.byCarrier) {
    await query(
      `INSERT INTO report_fulfillment_by_carrier (report_date, carrier, shipments, avg_days, on_time_rate)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (report_date, carrier) DO UPDATE SET
         shipments = EXCLUDED.shipments, avg_days = EXCLUDED.avg_days, on_time_rate = EXCLUDED.on_time_rate`,
      [m.date, c.carrier, c.shipments, c.avgDays, c.onTimeRate]
    );
  }
}

async function upsertPayments(m) {
  for (const p of m.payments) {
    const successRate = p.count ? parseFloat((p.successCount / p.count).toFixed(4)) : 0;
    await query(
      `INSERT INTO report_payment_summaries
         (report_date, payment_method, transaction_count, total_amount, success_count, success_rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (report_date, payment_method) DO UPDATE SET
         transaction_count = EXCLUDED.transaction_count,
         total_amount = EXCLUDED.total_amount,
         success_count = EXCLUDED.success_count,
         success_rate = EXCLUDED.success_rate`,
      [m.date, p.method, p.count, p.amount, p.successCount, successRate]
    );
  }
}

async function upsertCommunications(m) {
  for (const c of m.communications) {
    await query(
      `INSERT INTO report_communications_summary
         (report_date, comm_type, total_sent, total_opened, open_rate, click_rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (report_date, comm_type) DO UPDATE SET
         total_sent = EXCLUDED.total_sent,
         total_opened = EXCLUDED.total_opened,
         open_rate = EXCLUDED.open_rate,
         click_rate = EXCLUDED.click_rate`,
      [m.date, c.type, c.totalSent, c.totalOpened, c.openRate, c.clickRate]
    );
  }
}

// Persiste un día completo en todas las tablas. Se usa tanto desde
// el seed histórico como desde la recalculación batch on-demand.
async function persistDailyMetrics(metrics) {
  await upsertSalesDaily(metrics);
  await upsertProductMetrics(metrics);
  await upsertOrderStatus(metrics);
  await upsertInventorySnapshots(metrics);
  await upsertFulfillment(metrics);
  await upsertPayments(metrics);
  await upsertCommunications(metrics);

  return {
    tablesUpdated: [
      "report_sales_daily",
      "report_product_metrics",
      "report_order_status",
      "report_inventory_snapshots",
      "report_fulfillment_metrics",
      "report_fulfillment_by_region",
      "report_fulfillment_by_carrier",
      "report_payment_summaries",
      "report_communications_summary",
    ],
  };
}

module.exports = { persistDailyMetrics };
