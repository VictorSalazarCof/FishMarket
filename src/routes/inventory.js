const express = require("express");
const router  = express.Router();

const mock = require("../data/mockData");
const db   = require("../repositories/reportsRepository");
const { withFallback } = require("../utils/dataSource");
const { AppError, asyncHandler } = require("../utils/errors");
const { adminOnly } = require("../middleware/authAdminMiddleware");

router.use(adminOnly);

const lowStock = withFallback(db.getLowStock, mock.getLowStock);

// ── GET /api/v1/inventory/low-stock ──────────────────────────
// Query params: threshold (default 10)
router.get("/low-stock", asyncHandler(async (req, res) => {
  const { threshold } = req.query;

  if (threshold !== undefined && (isNaN(Number(threshold)) || Number(threshold) < 0)) {
    throw new AppError(400, "Bad Request", "threshold debe ser un número entero positivo");
  }

  res.json(await lowStock({ threshold }));
}));

module.exports = router;
