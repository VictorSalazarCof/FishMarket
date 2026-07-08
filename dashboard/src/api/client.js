// Fetch wrapper con rutas RELATIVAS (mismo origen) — el dashboard se
// sirve como estático desde el propio backend G10 en producción. En
// dev, vite.config.js proxea /api hacia el backend local.
//
// Si un 401 llega y hay refresh_token, intenta refrescar la sesión
// contra G2 una vez y reintenta la request original — así una sesión
// de 1h no corta al usuario en medio de una vista abierta.

import { getToken, getRefreshToken, refreshSession, clearSession } from "./auth";
import { refreshToken as g2Refresh } from "./g2Auth";

export class ApiError extends Error {
  constructor(status, body) {
    super((body && body.message) || `Error ${status}`);
    this.status = status;
    this.code = body && body.code;
    this.correlationId = body && body.correlationId;
    this.isAuthError = status === 401 || status === 403;
  }
}

let pendingRefresh = null;

async function ensureFreshToken() {
  const rt = getRefreshToken();
  if (!rt) return null;
  if (!pendingRefresh) {
    pendingRefresh = g2Refresh(rt)
      .then((data) => refreshSession(data).access_token)
      .catch(() => {
        clearSession();
        return null;
      })
      .finally(() => { pendingRefresh = null; });
  }
  return pendingRefresh;
}

export async function apiFetch(path, options = {}, _retried = false) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401 && !_retried) {
    const newToken = await ensureFreshToken();
    if (newToken) return apiFetch(path, options, true);
  }

  if (res.status === 401) {
    clearSession();
  }

  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch { /* respuesta no-JSON */ }
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return null;
  return res.json();
}

export function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
