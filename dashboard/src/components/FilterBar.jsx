// Fila única de filtros arriba de todo el contenido — escopa todos
// los paneles del dashboard a la misma ventana de fechas.

import { timeAgo } from "../utils/format";

const GROUP_OPTIONS = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

export default function FilterBar({ filters, onChange, onRefresh, loading, lastUpdated, wsStatus }) {
  function update(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function applyPreset(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    onChange({
      ...filters,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
  }

  return (
    <div className="filter-bar">
      <div className="filter-bar__fields">
        <div className="filter-field">
          <label htmlFor="f-start">Desde</label>
          <input
            id="f-start" type="date" value={filters.startDate} max={filters.endDate}
            onChange={(e) => update("startDate", e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="f-end">Hasta</label>
          <input
            id="f-end" type="date" value={filters.endDate} min={filters.startDate}
            onChange={(e) => update("endDate", e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="f-group">Agrupar por</label>
          <select id="f-group" value={filters.groupBy} onChange={(e) => update("groupBy", e.target.value)}>
            {GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="filter-bar__presets" role="group" aria-label="Rango rápido">
        <button className="btn" type="button" onClick={() => applyPreset(7)}>7 días</button>
        <button className="btn" type="button" onClick={() => applyPreset(30)}>30 días</button>
        <button className="btn" type="button" onClick={() => applyPreset(90)}>90 días</button>
      </div>

      <div className="filter-bar__status">
        <span className="status-pill">
          <span className={`live-dot ${wsStatus === "open" ? "live-dot--on" : ""}`} />
          {wsStatus === "open" ? "En vivo" : wsStatus === "connecting" ? "Conectando…" : "Sin conexión"}
        </span>

        {lastUpdated && <span className="status-pill">Actualizado {timeAgo(lastUpdated)}</span>}

        <button className="btn btn--primary" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Cargando…" : "Refrescar"}
        </button>
      </div>
    </div>
  );
}
