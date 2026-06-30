// ============================================================
// G10 – Repositorio de batch jobs
// ============================================================

const { query } = require("../db/pool");
const { generateDailyMetrics } = require("../utils/dataGenerator");
const { persistDailyMetrics } = require("./writeRepository");

async function createJob({ jobId, targetDate, scope }) {
  await query(
    `INSERT INTO batch_jobs (job_id, status, target_date, scope, started_at)
     VALUES ($1, 'running', $2, $3, NOW())
     ON CONFLICT (job_id) DO NOTHING`,
    [jobId, targetDate, scope]
  );
}

async function completeJob(jobId) {
  await query(
    `UPDATE batch_jobs SET status = 'completed', completed_at = NOW() WHERE job_id = $1`,
    [jobId]
  );
}

async function failJob(jobId, errorMessage) {
  await query(
    `UPDATE batch_jobs SET status = 'failed', completed_at = NOW(), error_message = $2 WHERE job_id = $1`,
    [jobId, errorMessage]
  );
}

// Genera datos sintéticos consistentes para targetDate y los persiste
// en todas las tablas de reporte. Devuelve la lista de tablas afectadas
// para que el evento WebSocket `batch:completed` la reporte tal como
// ya lo hacía en la versión mock.
async function runRecalculation({ jobId, targetDate, scope }) {
  await createJob({ jobId, targetDate, scope });
  try {
    const metrics = generateDailyMetrics(targetDate);
    const { tablesUpdated } = await persistDailyMetrics(metrics);
    await completeJob(jobId);
    return { tablesUpdated };
  } catch (err) {
    await failJob(jobId, err.message);
    throw err;
  }
}

module.exports = { runRecalculation };
