// ============================================================
// G10 – Selector de fuente de datos (DB real vs mock fallback)
// ============================================================
// Si DATABASE_URL está configurada, usa el repositorio real.
// Si no, usa mockData.js (igual que en E2) para que el server
// siga funcionando en local sin necesidad de Supabase.

const { isConfigured } = require("../db/pool");

function withFallback(dbFn, mockFn) {
  return async (params) => {
    if (isConfigured()) {
      return dbFn(params);
    }
    return mockFn(params);
  };
}

module.exports = { withFallback };
