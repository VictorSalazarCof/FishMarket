// Parte-del-todo: una única barra horizontal segmentada, orden
// categórico fijo. Gap de 2px en el color de superficie entre
// segmentos (mask vía el borde del contenedor). Etiqueta directa solo
// si el segmento es lo bastante ancho; el resto vive en la leyenda.

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)",
                 "var(--series-5)", "var(--series-6)", "var(--series-7)", "var(--series-8)"];

export default function StackedBar({ segments, formatValue }) {
  if (!segments || segments.length === 0) {
    return <p className="empty-state">Sin datos para el rango seleccionado.</p>;
  }
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  return (
    <div className="bar-list" style={{ gap: 14 }}>
      <div className="stacked-bar">
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={seg.key}
              className="stacked-bar__seg"
              style={{
                width: `${pct}%`,
                background: SERIES[i % SERIES.length],
                marginRight: i < segments.length - 1 ? 2 : 0,
              }}
              title={`${seg.label}: ${formatValue ? formatValue(seg.value) : seg.value}`}
            >
              {pct >= 10 && (
                <span style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff",
                }}>
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="legend">
        {segments.map((seg, i) => (
          <span className="legend__item" key={seg.key}>
            <span className="legend__swatch" style={{ background: SERIES[i % SERIES.length] }} />
            {seg.label} · {formatValue ? formatValue(seg.value) : seg.value}
          </span>
        ))}
      </div>
    </div>
  );
}
