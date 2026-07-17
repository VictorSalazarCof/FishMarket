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

// product_name/category están en el SET del ON CONFLICT (no solo
// current_stock/is_low_stock, como estaba antes): sin esto, una fila ya
// creada para ese (snapshot_date, product_id) nunca actualizaba el nombre
// aunque llegara uno mejor en un ciclo posterior — quedaba invisible antes
// de G3 (el nombre siempre era el mismo productId, nunca "cambiaba"), pero
// bloqueaba en silencio el enriquecimiento de catálogo de G3 una vez que
// existió (confirmado: una fila del primer ciclo de hoy, antes de G3,
// se quedó pegada en productId como nombre pese a que ciclos posteriores
// sí resolvían el nombre real).
async function upsertInventorySnapshots(m) {
  for (const p of m.inventory) {
    const isLow = p.currentStock < p.reorderPoint;
    await query(
      `INSERT INTO report_inventory_snapshots
         (snapshot_date, product_id, product_name, category, current_stock, reorder_point, is_low_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (snapshot_date, product_id) DO UPDATE SET
         product_name = EXCLUDED.product_name,
         category = EXCLUDED.category,
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

// A diferencia de todos los upserts de arriba (que sobreescriben por
// fecha — pensados para recalcular un día completo desde cero), este es
// INCREMENTAL: cada evento de pago que llega por streaming (G6, ver
// src/services/g6PaymentsConsumer.js) suma sobre lo que ya había en vez de
// reemplazarlo, porque los eventos llegan de a uno y no representan el
// día completo. success_rate no se puede recalcular limpio con EXCLUDED
// en el mismo UPSERT (necesita el transaction_count YA incrementado), así
// que se hace con un segundo UPDATE inmediatamente después.
async function incrementPaymentSummary({ date, method, amount, success }) {
  await query(
    `INSERT INTO report_payment_summaries
       (report_date, payment_method, transaction_count, total_amount, success_count)
     VALUES ($1, $2, 1, $3, $4)
     ON CONFLICT (report_date, payment_method) DO UPDATE SET
       transaction_count = report_payment_summaries.transaction_count + 1,
       total_amount = report_payment_summaries.total_amount + EXCLUDED.total_amount,
       success_count = report_payment_summaries.success_count + EXCLUDED.success_count`,
    [date, method, amount, success ? 1 : 0]
  );

  await query(
    `UPDATE report_payment_summaries
     SET success_rate = success_count::numeric / NULLIF(transaction_count, 0)
     WHERE report_date = $1 AND payment_method = $2`,
    [date, method]
  );
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

// upsertInventorySnapshots y upsertFulfillment se exportan además de
// persistDailyMetrics porque src/services/liveIntegrationsSync.js (E4,
// integración en vivo con G7/G8) las reutiliza directamente para no
// duplicar lógica de SQL — no cambia nada de su comportamiento ni del
// flujo existente de persistDailyMetrics.
module.exports = { persistDailyMetrics, upsertInventorySnapshots, upsertFulfillment, incrementPaymentSummary };
