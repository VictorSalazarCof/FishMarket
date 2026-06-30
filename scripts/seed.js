// ============================================================
// G10 – Seed de datos históricos
// ============================================================
// Pobla las tablas report_* con N días de datos sintéticos
// consistentes, para que los endpoints GET tengan algo real que
// mostrar apenas se despliega el servicio (sin esperar a que se
// disparen recalculaciones manualmente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed.js [--days=30] [--end=2025-01-31]
//
// Requiere tener DATABASE_URL configurada (no usa fallback mock).

require("dotenv").config();
const { generateDailyMetrics } = require("../src/utils/dataGenerator");
const { persistDailyMetrics } = require("../src/repositories/writeRepository");
const { isConfigured, pool } = require("../src/db/pool");

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    })
  );
  return {
    days: Number(args.days || 30),
    end: args.end || new Date().toISOString().split("T")[0],
  };
}

function dateRange(endStr, days) {
  const end = new Date(endStr);
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

async function main() {
  if (!isConfigured()) {
    console.error("❌ DATABASE_URL no está configurada. Define la variable de entorno antes de correr el seed.");
    process.exit(1);
  }

  const { days, end } = parseArgs();
  const dates = dateRange(end, days);

  console.log(`🌱 Sembrando ${dates.length} días de datos (${dates[0]} → ${dates[dates.length - 1]})...`);

  for (const date of dates) {
    const metrics = generateDailyMetrics(date);
    await persistDailyMetrics(metrics);
    process.stdout.write(`  ✓ ${date}\n`);
  }

  console.log("✅ Seed completo.");
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Error en seed:", err.message);
  process.exit(1);
});
