// ============================================================
// G10 – Conexión a PostgreSQL (Supabase)
// ============================================================
// Si DATABASE_URL no está configurada, el pool queda en null y
// los repositorios hacen fallback automático a datos mock.
// Esto permite levantar el server localmente sin DB (E2) y
// con persistencia real en cloud (E3) sin tocar código.

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

let pool = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // requerido por Supabase pooler
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on("error", (err) => {
    console.error("❌ Error inesperado en el pool de Postgres:", err.message);
  });
} else {
  console.warn(
    "⚠️  DATABASE_URL no configurada — el servicio usará datos mock como fallback."
  );
}

// ── Helper de query con manejo de errores uniforme ────────────
async function query(text, params) {
  if (!pool) {
    const err = new Error("DATABASE_URL no configurada");
    err.code = "DB_NOT_CONFIGURED";
    throw err;
  }
  return pool.query(text, params);
}

// ── Health check de la conexión ────────────────────────────────
async function checkConnection() {
  if (!pool) return { connected: false, reason: "DATABASE_URL no configurada" };
  try {
    await pool.query("SELECT 1");
    return { connected: true };
  } catch (err) {
    return { connected: false, reason: err.message };
  }
}

function isConfigured() {
  return pool !== null;
}

module.exports = { pool, query, checkConnection, isConfigured };
