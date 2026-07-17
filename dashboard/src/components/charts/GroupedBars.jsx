// Comparar 2 medidas por categoría, misma unidad/escala (ej. dos
// tasas en %) — un solo eje 0..100, 2 series categóricas con leyenda.

const SERIES = ["var(--series-1)", "var(--series-2)"];

export default function GroupedBars({ rows, seriesNames, formatValue, max = 100, getRowNote }) {
  if (!rows || rows.length === 0) {
    return <p className="empty-state">Sin datos para el rango seleccionado.</p>;
  }

  return (
    <div>
      <div className="legend" style={{ marginBottom: 10 }}>
        {seriesNames.map((name, i) => (
          <span className="legend__item" key={name}>
            <span className="legend__swatch" style={{ background: SERIES[i] }} />
            {name}
          </span>
        ))}
      </div>
      <div className="bar-list">
        {rows.map((row) => (
          <div key={row.key} style={{ marginBottom: 10 }}>
            <div className="bar-list__label" style={{ marginBottom: 4 }}>
              {row.label}
              {getRowNote && <span className="bar-list__note">{getRowNote(row)}</span>}
            </div>
            {row.values.map((value, i) => (
              <div className="bar-list__row" style={{ gridTemplateColumns: "0px 1fr auto" }} key={i}>
                <span />
                <div className="bar-list__track">
                  <div
                    className="bar-list__fill"
                    style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: SERIES[i] }}
                  />
                </div>
                <span className="bar-list__value">{formatValue ? formatValue(value) : value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
