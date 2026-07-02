import LowStockTable from "./LowStockTable";

export default function AdvancedFilters({ filters, threshold, onThresholdChange, isThresholdPending, lowStock }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="font-display text-sm font-bold text-slate-800">Filtro específico — umbral de stock bajo</span>
        <p className="mb-4 mt-1.5 text-[11.5px] text-slate-400">
          Ajusta el umbral que define "stock bajo" en{" "}
          <code className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-slate-600">
            GET /inventory/low-stock
          </code>
          . La tabla de abajo se actualiza en vivo (con un pequeño debounce para no saturar la API mientras arrastras).
        </p>

        <div className="mb-4 flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="70"
            value={threshold}
            aria-label="Umbral de stock bajo, en unidades"
            aria-valuemin={1}
            aria-valuemax={70}
            aria-valuenow={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-100 accent-indigo-600"
          />
          <span className="font-display flex min-w-[110px] items-center justify-end gap-1.5 text-right text-sm font-bold text-slate-800">
            {threshold} unidades
            {isThresholdPending && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" title="Actualizando…" />
            )}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            Desde {filters.startDate}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            Hasta {filters.endDate}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            Agrupado por {filters.groupBy === "week" ? "semana" : "día"}
          </span>
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-600">
            Umbral stock: {threshold}
          </span>
        </div>
      </div>

      <LowStockTable data={lowStock.data} loading={lowStock.loading} error={lowStock.error} />
    </div>
  );
}
