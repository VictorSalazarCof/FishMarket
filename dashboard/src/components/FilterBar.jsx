const PRESETS = [7, 30, 90];
const PERIOD_END = "2025-01-31";

function daysAgo(end, days) {
  const d = new Date(end);
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().split("T")[0];
}

export default function FilterBar({ filters, onChange, onRefresh, loading }) {
  function applyPreset(days) {
    onChange({
      startDate: daysAgo(PERIOD_END, days),
      endDate: PERIOD_END,
      groupBy: days > 45 ? "week" : "day",
      activePreset: days,
    });
  }

  function setField(field, value) {
    const next = { ...filters, [field]: value, activePreset: null };
    // Keep the range valid instead of letting an inverted range reach the API silently.
    if (field === "startDate" && value > next.endDate) next.endDate = value;
    if (field === "endDate" && value < next.startDate) next.startDate = value;
    onChange(next);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div className="flex gap-1">
        {PRESETS.map((days) => (
          <button
            key={days}
            onClick={() => applyPreset(days)}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              filters.activePreset === days
                ? "bg-slate-800 font-semibold text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {days} días
          </button>
        ))}
      </div>
      <div className="h-5 w-px bg-slate-200" />
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        Desde
        <input
          type="date"
          value={filters.startDate}
          max={filters.endDate}
          onChange={(e) => setField("startDate", e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:outline-2 focus:outline-indigo-500"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        Hasta
        <input
          type="date"
          value={filters.endDate}
          min={filters.startDate}
          onChange={(e) => setField("endDate", e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:outline-2 focus:outline-indigo-500"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        Agrupar
        <select
          value={filters.groupBy}
          onChange={(e) => setField("groupBy", e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:outline-2 focus:outline-indigo-500"
        >
          <option value="day">Día</option>
          <option value="week">Semana</option>
        </select>
      </label>
      <button
        onClick={onRefresh}
        aria-busy={loading}
        className="ml-auto flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 font-display text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-transform hover:-translate-y-0.5"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        Actualizar
      </button>
    </div>
  );
}

export { PERIOD_END, daysAgo };
