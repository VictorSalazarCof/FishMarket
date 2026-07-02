import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtInt, fmtMoney, fmtMoneyFull } from "../format";
import { useCountUp } from "../hooks/useCountUp";
import { ChartSkeleton } from "./Skeleton";

// Simple client-side linear projection over the fetched revenue series — not a
// trained model. There is no forecasting endpoint on the backend; this keeps
// the "predictive" panel honest about being a local least-squares extrapolation.
function computeForecast(series, groupBy, count) {
  if (series.length < 3) return [];
  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map((d) => d.revenue);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const stepDays = groupBy === "week" ? 7 : 1;
  const lastDate = new Date(series[n - 1].date);

  return Array.from({ length: count }, (_, k) => {
    const idx = n + k;
    const date = new Date(lastDate);
    date.setDate(date.getDate() + stepDays * (k + 1));
    return {
      date: date.toISOString().split("T")[0],
      forecast: Math.max(0, Math.round(intercept + slope * idx)),
    };
  });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white shadow-xl">
      <div className="mb-1.5 text-white/50">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="text-white/60">{p.dataKey === "forecast" ? "Proyección" : "Ingresos"}</span>
          <span className="font-bold tabular-nums">{fmtMoneyFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPanel({ sales, growthRate, loading }) {
  const series = sales?.timeSeries || [];

  const { forecast, chartData } = useMemo(() => {
    const forecastCount = Math.min(6, Math.max(2, Math.ceil(series.length * 0.25)));
    const fc = computeForecast(series, sales?.period.groupBy, forecastCount);
    const cd = [
      ...series.map((d) => ({ date: d.date.slice(5), revenue: d.revenue, forecast: null })),
      ...(series.length
        ? [{ date: series[series.length - 1].date.slice(5), revenue: series[series.length - 1].revenue, forecast: series[series.length - 1].revenue }]
        : []),
      ...fc.map((d) => ({ date: d.date.slice(5), revenue: null, forecast: d.forecast })),
    ];
    return { forecast: fc, chartData: cd };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, sales?.period.groupBy]);

  const revenue = useCountUp(sales?.summary.totalRevenue, { format: fmtMoneyFull });
  const hasGrowth = typeof growthRate === "number" && !Number.isNaN(growthRate);
  const isUp = hasGrowth && growthRate >= 0;

  if (loading && !sales) return <ChartSkeleton />;

  return (
    <div className="animate-rise-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-7 text-white shadow-xl shadow-indigo-900/20">
      <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-200">
            Analytics &amp; Predictive Panel
          </span>
          <div className="font-display mt-2 text-4xl font-extrabold tracking-tight">
            {loading && !sales ? "—" : revenue}
          </div>
          <div className="mt-1 text-xs text-indigo-200">
            {sales ? (
              <>
                <strong className="text-white">{fmtInt(sales.summary.totalOrders)}</strong> pedidos · ticket
                promedio <strong className="text-white">{fmtMoneyFull(sales.summary.averageOrderValue)}</strong>
              </>
            ) : (
              "Cargando…"
            )}
          </div>
        </div>

        {hasGrowth && (
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              isUp ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"
            }`}
          >
            {isUp ? "▲" : "▼"} {Math.abs(growthRate * 100).toFixed(1)}% vs. primera mitad del período
          </span>
        )}
      </div>

      <div className="relative z-10 mt-6 h-56 w-full">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c7d2fe" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmtMoney(v)}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#ffffff"
                strokeWidth={2}
                fill="url(#revenueFill)"
                connectNulls={false}
                dot={false}
                activeDot={{ r: 4, fill: "#ffffff" }}
                isAnimationActive
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#c7d2fe"
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="none"
                connectNulls
                dot={false}
                activeDot={{ r: 4, fill: "#c7d2fe" }}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-indigo-200">
            {loading ? "Cargando gráfico…" : "Sin datos para este período"}
          </div>
        )}
      </div>

      {forecast.length > 0 && (
        <p className="relative z-10 mt-3 flex items-center gap-1.5 text-[10.5px] text-indigo-200">
          <span className="inline-block h-0.5 w-3 border-t-2 border-dashed border-indigo-200" />
          Proyección: extrapolación lineal local sobre los últimos {series.length} períodos — no es un modelo
          entrenado, no hay endpoint de forecasting en el backend.
        </p>
      )}
    </div>
  );
}
