// Meter: un ratio único contra un límite (0..1). El track es un paso
// más claro de la misma rampa que el fill, para que el estado se lea
// de corrido en toda la barra.

export default function Meter({ label, ratio, formatValue }) {
  const pct = Math.max(0, Math.min(1, ratio || 0)) * 100;
  const text = formatValue ? formatValue(ratio) : `${pct.toFixed(1)}%`;

  return (
    <div className="meter">
      <div className="meter__labels">
        <span>{label}</span>
        <span>{text}</span>
      </div>
      <div className="meter__track">
        <div className="meter__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
