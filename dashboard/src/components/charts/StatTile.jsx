// Stat tile: label + value + delta opcional (signo, color = dirección x si "arriba" es bueno).
// accent: color del borde superior — agrupa visualmente KPIs del mismo
// dominio (ingresos, operación, logística) en vez de un acento único
// repetido en las 6 tarjetas.

export default function StatTile({ label, value, delta, deltaGoodWhenUp = true, accent = "var(--seq-450)" }) {
  const hasDelta = delta !== undefined && delta !== null && !Number.isNaN(delta);
  const isUp = hasDelta && delta > 0;
  const isGood = hasDelta && (deltaGoodWhenUp ? isUp : !isUp) && delta !== 0;

  return (
    <div className="stat-tile" style={{ "--accent": accent }}>
      <span className="stat-tile__label">{label}</span>
      <span className="stat-tile__value">{value}</span>
      {hasDelta && delta !== 0 && (
        <span className={`stat-tile__delta ${isGood ? "stat-tile__delta--up" : "stat-tile__delta--down"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
