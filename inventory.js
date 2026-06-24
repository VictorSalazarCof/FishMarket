const express = require("express");
const router  = express.Router();
const { getLowStock } = require("../data/mockData");

// ── GET /api/v1/inventory/low-stock ──────────────────────────
// Query params: threshold (default 10)
router.get("/low-stock", (req, res) => {
  const { threshold } = req.query;

  if (threshold !== undefined && (isNaN(Number(threshold)) || Number(threshold) < 0)) {
    return res.status(400).json({
      error:   "Bad Request",
      message: "threshold debe ser un número entero positivo",
    });
  }

  res.json(getLowStock({ threshold }));
});

module.exports = router;
