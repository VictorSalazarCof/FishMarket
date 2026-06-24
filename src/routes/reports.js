const express = require("express");
const router  = express.Router();
const {
  getSalesSummary,
  getProductBreakdown,
  getStatusBreakdown,
  getFulfillment,
  getCommunications,
  getOrderTrends,
  getPaymentSummary,
} = require("../data/mockData");

// ── GET /api/v1/reports/sales-summary ────────────────────────
// Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), groupBy (day|week|month)
router.get("/sales-summary", (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  const validGroupBy = ["day", "week", "month"];
  if (groupBy && !validGroupBy.includes(groupBy)) {
    return res.status(400).json({
      error:   "Bad Request",
      message: `groupBy debe ser uno de: ${validGroupBy.join(", ")}`,
    });
  }

  res.json(getSalesSummary({ startDate, endDate, groupBy }));
});

// ── GET /api/v1/reports/products ─────────────────────────────
// Query params: startDate, endDate, limit (default 10)
router.get("/products", (req, res) => {
  const { startDate, endDate, limit } = req.query;
  res.json(getProductBreakdown({ startDate, endDate, limit }));
});

// ── GET /api/v1/reports/status ───────────────────────────────
// Query params: startDate, endDate
router.get("/status", (req, res) => {
  const { startDate, endDate } = req.query;
  res.json(getStatusBreakdown({ startDate, endDate }));
});

// ── GET /api/v1/reports/fulfillment ──────────────────────────
// Query params: startDate, endDate
router.get("/fulfillment", (req, res) => {
  const { startDate, endDate } = req.query;
  res.json(getFulfillment({ startDate, endDate }));
});

// ── GET /api/v1/reports/communications ───────────────────────
// Query params: startDate, endDate
router.get("/communications", (req, res) => {
  const { startDate, endDate } = req.query;
  res.json(getCommunications({ startDate, endDate }));
});

// ── GET /api/v1/reports/order-trends ─────────────────────────
// Query params: startDate, endDate, interval (day|week|month)
router.get("/order-trends", (req, res) => {
  const { startDate, endDate, interval } = req.query;

  const validIntervals = ["day", "week", "month"];
  if (interval && !validIntervals.includes(interval)) {
    return res.status(400).json({
      error:   "Bad Request",
      message: `interval debe ser uno de: ${validIntervals.join(", ")}`,
    });
  }

  res.json(getOrderTrends({ startDate, endDate, interval }));
});

// ── GET /api/v1/reports/payment-summary ──────────────────────
// Query params: startDate, endDate
router.get("/payment-summary", (req, res) => {
  const { startDate, endDate } = req.query;
  res.json(getPaymentSummary({ startDate, endDate }));
});

module.exports = router;
