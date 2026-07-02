// Single source of truth for the categorical/status color mapping used across
// charts, badges and tables — avoids the hex string living in two places.
export const STATUS_HEX = {
  delivered: "#4f46e5",
  processing: "#10b981",
  shipped: "#f59e0b",
  pending: "#0ea5e9",
  cancelled: "#8b5cf6",
  returned: "#f43f5e",
};

export const STATUS_LABELS_ES = {
  delivered: "entregado",
  processing: "procesando",
  shipped: "enviado",
  pending: "pendiente",
  cancelled: "cancelado",
  returned: "devuelto",
};

export const URGENCY_BADGE_CLASSES = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-sky-50 text-sky-700",
};

export const URGENCY_DOT_CLASSES = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-sky-500",
};

export function paymentSuccessTone(rate) {
  if (rate >= 0.95) return "bg-emerald-50 text-emerald-700";
  if (rate >= 0.85) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}
