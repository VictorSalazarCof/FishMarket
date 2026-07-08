// Tendencia en el tiempo — serie única, un hue secuencial. Área al
// ~10% de opacidad, línea de 2px, gridlines hairline, crosshair +
// tooltip en hover (la línea vertical encuentra la X más cercana).

import { useMemo, useRef, useState } from "react";

const VB_W = 600;
const PAD_L = 46;
const PAD_R = 10;
const PAD_T = 10;
const PAD_B = 22;

function niceMax(value) {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const norm = value / magnitude;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * magnitude;
}

export default function TrendChart({ data, color = "var(--seq-450)", formatValue, seriesName, height = 180 }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const { points, yTicks } = useMemo(() => {
    if (!data || data.length === 0) return { points: [], yTicks: [] };
    const max = niceMax(Math.max(...data.map((d) => d.value), 0));
    const innerW = VB_W - PAD_L - PAD_R;
    const innerH = height - PAD_T - PAD_B;
    const pts = data.map((d, i) => ({
      x: PAD_L + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y: PAD_T + innerH - (max ? (d.value / max) * innerH : 0),
      ...d,
    }));
    const ticks = [0, 0.5, 1].map((f) => ({ value: max * f, y: PAD_T + innerH - f * innerH }));
    return { points: pts, yTicks: ticks };
  }, [data, height]);

  if (!data || data.length === 0) {
    return <p className="empty-state">Sin datos para el rango seleccionado.</p>;
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const baseline = height - PAD_B;
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(2)},${baseline} L${points[0].x.toFixed(2)},${baseline} Z`;
  const xTickIdx = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);
  const last = points[points.length - 1];

  function handleMove(evt) {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((evt.clientX - rect.left) / rect.width) * VB_W;
    let nearest = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < bestDist) { bestDist = dist; nearest = i; }
    });
    const p = points[nearest];
    setHover({ index: nearest, x: (p.x / VB_W) * rect.width, y: (p.y / height) * rect.height });
  }

  const hp = hover ? points[hover.index] : null;

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${height}`}
        width="100%"
        height={height}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: "block", overflow: "visible", cursor: "crosshair" }}
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={VB_W - PAD_R} y1={t.y} y2={t.y} stroke="var(--gridline)" strokeWidth="1" />
            <text x={PAD_L - 8} y={t.y + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)">
              {formatValue ? formatValue(t.value, true) : Math.round(t.value)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={color} opacity="0.10" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => xTickIdx.has(i) && (
          <text key={i} x={p.x} y={height - 4} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
            {p.label}
          </text>
        ))}

        <circle cx={last.x} cy={last.y} r="4" fill={color} stroke="var(--surface-1)" strokeWidth="2" />

        {hp && (
          <>
            <line x1={hp.x} x2={hp.x} y1={PAD_T} y2={baseline} stroke="var(--baseline)" strokeWidth="1" />
            <circle cx={hp.x} cy={hp.y} r="4" fill={color} stroke="var(--surface-1)" strokeWidth="2" />
          </>
        )}
      </svg>

      {hp && (
        <div className="chart-tooltip" style={{ left: hover.x, top: hover.y, "--dot-color": color }}>
          <div className="chart-tooltip__title">{hp.label}</div>
          <div className="chart-tooltip__row">
            <span className="chart-tooltip__key">{seriesName}</span>
            <span className="chart-tooltip__value">{formatValue ? formatValue(hp.value) : hp.value}</span>
          </div>
        </div>
      )}
    </div>
  );
}
