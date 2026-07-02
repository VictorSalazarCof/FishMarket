import { useState } from "react";
import { daysAgo, PERIOD_END } from "../components/FilterBar";
import { useDebouncedValue } from "./useDebouncedValue";
import {
  useFulfillment,
  useLowStock,
  useOrderTrends,
  usePaymentSummary,
  useSalesSummary,
  useStatusBreakdown,
} from "./queries";

// Adapts a React Query result to the {data, loading, error} shape the panels expect.
function adapt(query) {
  return { data: query.data, loading: query.isLoading, error: query.error?.message ?? null, reload: query.refetch };
}

// Single place that owns filter/threshold UI state and the six report queries —
// keeps route components thin and gives every view the same consistent slice of data.
export function useDashboardData() {
  const [threshold, setThreshold] = useState(10);
  const debouncedThreshold = useDebouncedValue(threshold, 350);
  const [filters, setFilters] = useState({
    startDate: daysAgo(PERIOD_END, 30),
    endDate: PERIOD_END,
    groupBy: "day",
    activePreset: 30,
  });

  const dateParams = { startDate: filters.startDate, endDate: filters.endDate };

  const salesQuery = useSalesSummary({ ...dateParams, groupBy: filters.groupBy });
  const trendsQuery = useOrderTrends({ ...dateParams, interval: filters.groupBy });
  const statusQuery = useStatusBreakdown(dateParams);
  const lowStockQuery = useLowStock(debouncedThreshold);
  const paymentQuery = usePaymentSummary(dateParams);
  const fulfillmentQuery = useFulfillment(dateParams);

  const loadingAny =
    salesQuery.isFetching ||
    statusQuery.isFetching ||
    lowStockQuery.isFetching ||
    paymentQuery.isFetching ||
    fulfillmentQuery.isFetching ||
    trendsQuery.isFetching;

  function refreshAll() {
    salesQuery.refetch();
    trendsQuery.refetch();
    statusQuery.refetch();
    lowStockQuery.refetch();
    paymentQuery.refetch();
    fulfillmentQuery.refetch();
  }

  return {
    filters,
    setFilters,
    threshold,
    setThreshold,
    isThresholdPending: threshold !== debouncedThreshold,
    loadingAny,
    refreshAll,
    sales: adapt(salesQuery),
    trends: trendsQuery,
    status: adapt(statusQuery),
    lowStock: adapt(lowStockQuery),
    payment: adapt(paymentQuery),
    fulfillment: adapt(fulfillmentQuery),
  };
}
