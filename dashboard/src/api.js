const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_BASE = `${API_ROOT}/api/v1`;

async function getJson(url) {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || res.statusText);
  return body;
}

export function fetchHealth() {
  return getJson(`${API_ROOT}/health`);
}

export function fetchSalesSummary({ startDate, endDate, groupBy }) {
  const qs = new URLSearchParams({ startDate, endDate, groupBy });
  return getJson(`${API_BASE}/reports/sales-summary?${qs}`);
}

export function fetchStatusBreakdown({ startDate, endDate }) {
  const qs = new URLSearchParams({ startDate, endDate });
  return getJson(`${API_BASE}/reports/status?${qs}`);
}

export function fetchLowStock({ threshold = 10 } = {}) {
  const qs = new URLSearchParams({ threshold });
  return getJson(`${API_BASE}/inventory/low-stock?${qs}`);
}

export function fetchPaymentSummary({ startDate, endDate }) {
  const qs = new URLSearchParams({ startDate, endDate });
  return getJson(`${API_BASE}/reports/payment-summary?${qs}`);
}

export function fetchFulfillment({ startDate, endDate }) {
  const qs = new URLSearchParams({ startDate, endDate });
  return getJson(`${API_BASE}/reports/fulfillment?${qs}`);
}

export function fetchOrderTrends({ startDate, endDate, interval }) {
  const qs = new URLSearchParams({ startDate, endDate, interval });
  return getJson(`${API_BASE}/reports/order-trends?${qs}`);
}

export function wsUrl() {
  return `${API_ROOT.replace(/^http/, "ws")}/ws`;
}

export { API_ROOT, API_BASE };
