// Wrappers finos sobre los endpoints reales de G10 (src/routes/*.js).
// Todos requieren Bearer admin (adminOnly, integración G2).

import { apiFetch, buildQuery } from "./client";

export const fetchSalesSummary = ({ startDate, endDate, groupBy }) =>
  apiFetch(`/api/v1/reports/sales-summary${buildQuery({ startDate, endDate, groupBy })}`);

export const fetchProducts = ({ startDate, endDate, limit }) =>
  apiFetch(`/api/v1/reports/products${buildQuery({ startDate, endDate, limit })}`);

export const fetchStatus = ({ startDate, endDate }) =>
  apiFetch(`/api/v1/reports/status${buildQuery({ startDate, endDate })}`);

export const fetchFulfillment = ({ startDate, endDate }) =>
  apiFetch(`/api/v1/reports/fulfillment${buildQuery({ startDate, endDate })}`);

export const fetchCommunications = ({ startDate, endDate }) =>
  apiFetch(`/api/v1/reports/communications${buildQuery({ startDate, endDate })}`);

export const fetchOrderTrends = ({ startDate, endDate, interval }) =>
  apiFetch(`/api/v1/reports/order-trends${buildQuery({ startDate, endDate, interval })}`);

export const fetchPaymentSummary = ({ startDate, endDate }) =>
  apiFetch(`/api/v1/reports/payment-summary${buildQuery({ startDate, endDate })}`);

export const fetchLowStock = ({ threshold }) =>
  apiFetch(`/api/v1/inventory/low-stock${buildQuery({ threshold })}`);

export const triggerBatchRecalculate = ({ targetDate, scope }) =>
  apiFetch("/api/v1/batch/recalculate", {
    method: "POST",
    body: JSON.stringify({ targetDate, scope }),
  });
