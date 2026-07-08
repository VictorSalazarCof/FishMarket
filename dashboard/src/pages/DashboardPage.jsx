// Página principal — compone filtros + KPIs + gráficos de reportes +
// paneles en vivo (WebSocket). Escopa todo a la misma ventana de
// fechas, tal como pide la regla de filtros de la skill dataviz.

import { useEffect, useState, useCallback } from "react";
import FilterBar from "../components/FilterBar";
import KpiRow from "../components/KpiRow";
import SalesTrendPanel from "../components/SalesTrendPanel";
import TopProductsPanel from "../components/TopProductsPanel";
import StatusBreakdownPanel from "../components/StatusBreakdownPanel";
import PaymentsPanel from "../components/PaymentsPanel";
import FulfillmentPanel from "../components/FulfillmentPanel";
import CommunicationsPanel from "../components/CommunicationsPanel";
import LowStockPanel from "../components/LowStockPanel";
import OrdersTable from "../components/OrdersTable";
import ActivityFeed from "../components/ActivityFeed";
import BatchTrigger from "../components/BatchTrigger";
import { useDashboardSocket } from "../ws/useDashboardSocket";
import {
  fetchSalesSummary, fetchProducts, fetchStatus, fetchFulfillment,
  fetchCommunications, fetchOrderTrends, fetchPaymentSummary,
} from "../api/reports";

function defaultFilters() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    groupBy: "day",
  };
}

export default function DashboardPage({ onLogout }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const socket = useDashboardSocket();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sales, products, status, fulfillment, communications, trends, payments] = await Promise.all([
        fetchSalesSummary(filters),
        fetchProducts({ ...filters, limit: 8 }),
        fetchStatus(filters),
        fetchFulfillment(filters),
        fetchCommunications(filters),
        fetchOrderTrends({ ...filters, interval: filters.groupBy }),
        fetchPaymentSummary(filters),
      ]);
      setData({ sales, products, status, fulfillment, communications, trends, payments });
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      if (err.isAuthError) { onLogout(); return; }
      setError(err.message || "No se pudo cargar la información de reportes.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.groupBy]);

  useEffect(() => { load(); }, [load]);

  // Refrescar automáticamente cuando el batch termina de recalcular.
  useEffect(() => socket.onEvent((evt) => {
    if (evt.type === "report:updated" || evt.type === "batch:completed") load();
  }), [socket, load]);

  return (
    <div className="app-main">
      {error && <div className="error-banner">⚠️ {error}</div>}

      <FilterBar
        filters={filters} onChange={setFilters} onRefresh={load}
        loading={loading} lastUpdated={lastUpdated} wsStatus={socket.status}
      />

      <KpiRow sales={data.sales} fulfillment={data.fulfillment} trends={data.trends} loading={loading} />

      <div className="grid grid--charts-2">
        <SalesTrendPanel sales={data.sales} loading={loading} />
        <StatusBreakdownPanel status={data.status} loading={loading} />
      </div>

      <div className="grid grid--charts-2">
        <TopProductsPanel products={data.products} loading={loading} />
        <PaymentsPanel payments={data.payments} loading={loading} />
      </div>

      <div className="grid grid--charts-2">
        <FulfillmentPanel fulfillment={data.fulfillment} loading={loading} />
        <CommunicationsPanel communications={data.communications} loading={loading} />
      </div>

      <div className="grid grid--split">
        <div className="grid" style={{ gap: 16 }}>
          <LowStockPanel socket={socket} />
          <BatchTrigger socket={socket} />
        </div>
        <div className="grid" style={{ gap: 16 }}>
          <OrdersTable events={socket.events} />
          <ActivityFeed events={socket.events} />
        </div>
      </div>
    </div>
  );
}
