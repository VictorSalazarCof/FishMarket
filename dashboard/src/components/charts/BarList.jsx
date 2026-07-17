// Comparación de magnitud (bajo→alto): lista de barras horizontales,
// un solo hue secuencial. Value a la derecha (equivalente a "valor en
// la punta"), nota opcional (ej. una tasa secundaria) sin segundo eje.

export default function BarList({ rows, formatValue, getNote, getColor }) {
  if (!rows || rows.length === 0) {
    return <p className="empty-state">Sin datos para el rango seleccionado.</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="bar-list">
      {rows.map((row, i) => (
        <div className="bar-list__row" key={row.key}>
          <span className="bar-list__label" title={row.label}>{row.label}</span>
          <div className="bar-list__track">
            <div
              className="bar-list__fill"
              style={{
                width: `${(row.value / max) * 100}%`,
                ...(getColor ? { background: getColor(row, i) } : null),
              }}
            />
          </div>
          <span className="bar-list__value">
            {formatValue ? formatValue(row.value) : row.value}
            {getNote && <span className="bar-list__note">{getNote(row)}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
