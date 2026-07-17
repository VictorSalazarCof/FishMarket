// Dispara POST /api/v1/batch/recalculate y sigue el progreso del job
// en vivo por WebSocket (batch:queued/running/completed/failed) — la
// vitrina del patrón batch del proyecto.

import { useEffect, useState } from "react";
import { triggerBatchRecalculate } from "../api/reports";

const SCOPES = [
  { value: "daily",   label: "Diario" },
  { value: "weekly",  label: "Semanal" },
  { value: "monthly", label: "Mensual" },
];

export default function BatchTrigger({ socket }) {
  const [scope, setScope] = useState("daily");
  const [job, setJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!socket || !job?.jobId) return undefined;
    return socket.onEvent((evt) => {
      if (evt.jobId !== job.jobId) return;
      if (evt.type === "batch:running") setJob((j) => ({ ...j, status: "running", progress: evt.progress, message: evt.message }));
      if (evt.type === "batch:completed") setJob((j) => ({ ...j, status: "completed", progress: 100, message: evt.message }));
      if (evt.type === "batch:failed") setJob((j) => ({ ...j, status: "failed", message: evt.message }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, job?.jobId]);

  async function handleTrigger() {
    setSubmitting(true);
    try {
      const res = await triggerBatchRecalculate({ scope });
      setJob({ jobId: res.jobId, status: "queued", progress: 5, message: res.message });
    } catch (err) {
      setJob({ jobId: null, status: "failed", message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const barColor = job?.status === "failed" ? "var(--status-critical)"
    : job?.status === "completed" ? "var(--status-good)"
    : "var(--seq-450)";
  const barWidth = job?.status === "completed" ? 100 : job?.progress || 0;

  return (
    <div className="card">
      <div className="card__header">
        <div>
          <h3 className="card__title">Recalcular reportes (batch)</h3>
          <p className="card__subtitle">Encola un job y sigue su progreso en vivo</p>
        </div>
      </div>
      <div className="card__body">
        <div className="inline-controls">
          <div className="filter-field">
            <label htmlFor="scope">Alcance</label>
            <select id="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
              {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button
            className="btn btn--primary" type="button" onClick={handleTrigger}
            disabled={submitting || job?.status === "running"}
          >
            {submitting ? "Encolando…" : "Recalcular ahora"}
          </button>
        </div>

        {job && (
          <div style={{ marginTop: 14 }}>
            <div className="meter__labels">
              <span>{job.message || job.status}</span>
              <span>{job.status === "completed" ? "100%" : job.status === "failed" ? "Error" : `${job.progress || 0}%`}</span>
            </div>
            <div className="meter__track" style={{ marginTop: 6 }}>
              <div className="meter__fill" style={{ width: `${barWidth}%`, background: barColor }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
