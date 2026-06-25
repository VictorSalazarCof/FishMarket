const express = require("express");
const router  = express.Router();
const { triggerBatchRecalculate } = require("../data/mockData");
const { broadcast } = require("../websocket/broadcaster");

// ── POST /api/v1/batch/recalculate ───────────────────────────
// Body: { targetDate (YYYY-MM-DD), scope (daily|weekly|monthly) }
router.post("/recalculate", (req, res) => {
  const { targetDate, scope } = req.body || {};

  const validScopes = ["daily", "weekly", "monthly"];
  if (scope && !validScopes.includes(scope)) {
    return res.status(400).json({
      error:   "Bad Request",
      message: `scope debe ser uno de: ${validScopes.join(", ")}`,
    });
  }

  if (targetDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      return res.status(400).json({
        error:   "Bad Request",
        message: "targetDate debe tener formato YYYY-MM-DD",
      });
    }
  }

  const result = triggerBatchRecalculate({ targetDate, scope });

  // ── Simular ciclo de vida del job vía WebSocket ───────────
  broadcast({
    type:       "batch:queued",
    jobId:      result.jobId,
    targetDate: result.targetDate,
    scope:      result.scope,
    message:    `Job encolado para recalcular reportes del ${result.targetDate}`,
  });

  setTimeout(() => broadcast({
    type:     "batch:running",
    jobId:    result.jobId,
    progress: 25,
    message:  "Procesando eventos de órdenes (G5)...",
  }), 1500);

  setTimeout(() => broadcast({
    type:     "batch:running",
    jobId:    result.jobId,
    progress: 60,
    message:  "Consolidando métricas de pagos (G6)...",
  }), 3000);

  setTimeout(() => broadcast({
    type:     "batch:running",
    jobId:    result.jobId,
    progress: 90,
    message:  "Escribiendo snapshots en Supabase...",
  }), 4500);

  setTimeout(() => {
    broadcast({
      type:     "batch:completed",
      jobId:    result.jobId,
      message:  "Reportes actualizados correctamente",
      tablesUpdated: [
        "report_sales_daily",
        "report_product_metrics",
        "report_order_status",
        "report_payment_summaries",
      ],
      duration: 6000,
    });

    // Notificar que los reportes fueron actualizados
    broadcast({
      type:      "report:updated",
      tables:    ["report_sales_daily", "report_product_metrics"],
      targetDate: result.targetDate,
      message:   "Datos disponibles para consulta",
    });
  }, 6000);

  res.status(202).json(result);
});

module.exports = router;
