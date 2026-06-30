const express = require("express");
const router  = express.Router();

const mock = require("../data/mockData");
const db   = require("../repositories/reportsRepository");
const { withFallback } = require("../utils/dataSource");
const { AppError, asyncHandler } = require("../utils/errors");

const salesSummary     = withFallback(db.getSalesSummary,     mock.getSalesSummary);
const productBreakdown = withFallback(db.getProductBreakdown, mock.getProductBreakdown);
const statusBreakdown  = withFallback(db.getStatusBreakdown,  mock.getStatusBreakdown);
const fulfillment      = withFallback(db.getFulfillment,      mock.getFulfillment);
const communications   = withFallback(db.getCommunications,   mock.getCommunications);
const orderTrends      = withFallback(db.getOrderTrends,      mock.getOrderTrends);
const paymentSummary   = withFallback(db.getPaymentSummary,   mock.getPaymentSummary);

// ── GET /api/v1/reports/sales-summary ────────────────────────
// Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), groupBy (day|week|month)
router.get("/sales-summary", asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  const validGroupBy = ["day", "week", "month"];
  if (groupBy && !validGroupBy.includes(groupBy)) {
    throw new AppError(400, "Bad Request", `groupBy debe ser uno de: ${validGroupBy.join(", ")}`);
  }

  res.json(await salesSummary({ startDate, endDate, groupBy }));
}));

// ── GET /api/v1/reports/products ─────────────────────────────
// Query params: startDate, endDate, limit (default 10)
router.get("/products", asyncHandler(async (req, res) => {
  const { startDate, endDate, limit } = req.query;

  if (limit !== undefined && (isNaN(Number(limit)) || Number(limit) <= 0)) {
    throw new AppError(400, "Bad Request", "limit debe ser un número entero positivo");
  }

  res.json(await productBreakdown({ startDate, endDate, limit }));
}));

// ── GET /api/v1/reports/status ───────────────────────────────
// Query params: startDate, endDate
router.get("/status", asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  res.json(await statusBreakdown({ startDate, endDate }));
}));

// ── GET /api/v1/reports/fulfillment ──────────────────────────
// Query params: startDate, endDate
router.get("/fulfillment", asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  res.json(await fulfillment({ startDate, endDate }));
}));

// ── GET /api/v1/reports/communications ───────────────────────
// Query params: startDate, endDate
router.get("/communications", asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  res.json(await communications({ startDate, endDate }));
}));

// ── GET /api/v1/reports/order-trends ─────────────────────────
// Query params: startDate, endDate, interval (day|week|month)
router.get("/order-trends", asyncHandler(async (req, res) => {
  const { startDate, endDate, interval } = req.query;

  const validIntervals = ["day", "week", "month"];
  if (interval && !validIntervals.includes(interval)) {
    throw new AppError(400, "Bad Request", `interval debe ser uno de: ${validIntervals.join(", ")}`);
  }

  res.json(await orderTrends({ startDate, endDate, interval }));
}));

// ── GET /api/v1/reports/payment-summary ──────────────────────
// Query params: startDate, endDate
router.get("/payment-summary", asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  res.json(await paymentSummary({ startDate, endDate }));
}));

module.exports = router;
