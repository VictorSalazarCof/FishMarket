import { Outlet, useLocation } from "react-router-dom";
import { API_ROOT } from "./api";
import ErrorBoundary from "./components/ErrorBoundary";
import FilterBar from "./components/FilterBar";
import HealthPill from "./components/HealthPill";
import Sidebar from "./components/Sidebar";
import { useDashboardData } from "./hooks/useDashboardData";
import { useLiveEvents } from "./hooks/useLiveEvents";

const ROUTE_META = {
  "/": ["Resumen general", "Ventas, estado de pedidos, inventario y pagos — vista consolidada de solo lectura"],
  "/critical": ["Pedidos críticos", "Pedidos en estados de riesgo y productos en nivel crítico de stock"],
  "/filters": ["Filtro específico", "Ajusta el umbral de stock bajo y observa el resultado en vivo"],
  "/predictive": ["Reportes predictivos", "Proyección de ingresos y ranking de meses con más ventas"],
};

export default function App() {
  const dashboard = useDashboardData();
  const live = useLiveEvents();
  const { pathname } = useLocation();
  const [title, subtitle] = ROUTE_META[pathname] || ROUTE_META["/"];

  return (
    <div className="flex min-h-screen items-start bg-slate-50">
      <Sidebar />

      <main className="min-w-0 flex-1 px-11 py-10 pb-20">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              FishMarket Cloud · Grupo G10
            </span>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight text-slate-800">{title}</h1>
            <span className="text-[13px] text-slate-400">{subtitle}</span>
          </div>
          <HealthPill live={live} />
        </div>

        {pathname !== "/predictive" && (
          <FilterBar
            filters={dashboard.filters}
            onChange={dashboard.setFilters}
            onRefresh={dashboard.refreshAll}
            loading={dashboard.loadingAny}
          />
        )}

        <ErrorBoundary key={pathname}>
          <Outlet context={dashboard} />
        </ErrorBoundary>

        <footer className="mt-8 max-w-xl text-[11px] leading-relaxed text-slate-400">
          Datos servidos desde{" "}
          <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-500">{API_ROOT}</code>.
          Cuando <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-500">DATABASE_URL</code>{" "}
          no está configurada en el backend, cada respuesta cae a datos mock automáticamente — el indicador de estado
          arriba muestra si la conexión a Supabase está activa, y el punto adicional junto a él refleja el WebSocket
          en vivo (<code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-500">/ws</code>).
        </footer>
      </main>
    </div>
  );
}
