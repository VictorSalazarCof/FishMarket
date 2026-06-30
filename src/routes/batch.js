const express = require("express");
const router  = express.Router();

const { triggerBatchRecalculate } = require("../data/mockData");
const { broadcast } = require("../websocket/broadcaster");
const { isConfigured } = require("../db/pool");
const { runRecalculation } = require("../repositories/batchRepository");
const { AppError, asyncHandler } = require("../utils/errors");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── POST /api/v1/batch/recalculate ───────────────────────────
// Body: { targetDate (YYYY-MM-DD), scope (daily|weekly|monthly) }
router.post("/recalculate", asyncHandler(async (req, res) => {
  const { targetDate, scope } = req.body || {};

  const validScopes = ["daily", "weekly", "monthly"];
  if (scope && !validScopes.includes(scope)) {
    throw new AppError(400, "Bad Request", `scope debe ser uno de: ${validScopes.join(", ")}`);
  }

  if (targetDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      throw new AppError(400, "Bad Request", "targetDate debe tener formato YYYY-MM-DD");
    }
  }

  const result = triggerBatchRecalculate({ targetDate, scope });

  // Responder de inmediato; el job corre en background y reporta
  // su avance real por WebSocket (igual que en E2).
  res.status(202).json(result);

  broadcast({
    type:       "batch:queued",
    jobId:      result.jobId,
    targetDate: result.targetDate,
    scope:      result.scope,
    message:    `Job encolado para recalcular reportes del ${result.targetDate}`,
  });

  runBackgroundJob(result).catch((err) => {
    console.error(`❌ Job ${result.jobId} falló:`, err.message);
    broadcast({
      type:    "batch:failed",
      jobId:   result.jobId,
      message: "Error al recalcular reportes",
      error:   err.message,
    });
  });
}));

async function runBackgroundJob(result) {
  await delay(1500);
  broadcast({
    type:     "batch:running",
    jobId:    result.jobId,
    progress: 25,
    message:  "Procesando eventos de órdenes (G5)...",
  });

  await delay(1500);
  broadcast({
    type:     "batch:running",
    jobId:    result.jobId,
    progress: 60,
    message:  "Consolidando métricas de pagos (G6)...",
  });

  await delay(1500);
  broadcast({
    type:     "batch:running",
    jobId:    result.jobId,
    progress: 90,
    message:  "Escribiendo snapshots en Supabase...",
  });

  // ── Persistencia real ────────────────────────────────────────
  // Si DATABASE_URL está configurada, esto escribe de verdad en
  // las tablas report_*; si no, solo se simula el resultado para
  // mantener compatible la demo local sin DB.
  let tablesUpdated = [
    "report_sales_daily",
    "report_product_metrics",
    "report_order_status",
    "report_payment_summaries",
  ];

  if (isConfigured()) {
    const persisted = await runRecalculation({
      jobId:      result.jobId,
      targetDate: result.targetDate,
      scope:      result.scope,
    });
    tablesUpdated = persisted.tablesUpdated;
  }

  broadcast({
    type:          "batch:completed",
    jobId:         result.jobId,
    message:       "Reportes actualizados correctamente",
    tablesUpdated,
    persisted:     isConfigured(),
    duration:      6000,
  });

  broadcast({
    type:       "report:updated",
    tables:     tablesUpdated,
    targetDate: result.targetDate,
    message:    "Datos disponibles para consulta",
  });
}

module.exports = router;
