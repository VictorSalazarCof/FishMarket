import { useQuery } from "@tanstack/react-query";
import {
  fetchFulfillment,
  fetchLowStock,
  fetchOrderTrends,
  fetchPaymentSummary,
  fetchSalesSummary,
  fetchStatusBreakdown,
} from "../api";

export function useSalesSummary({ startDate, endDate, groupBy }) {
  return useQuery({
    queryKey: ["sales-summary", startDate, endDate, groupBy],
    queryFn: () => fetchSalesSummary({ startDate, endDate, groupBy }),
  });
}

export function useOrderTrends({ startDate, endDate, interval }) {
  return useQuery({
    queryKey: ["order-trends", startDate, endDate, interval],
    queryFn: () => fetchOrderTrends({ startDate, endDate, interval }),
  });
}

export function useStatusBreakdown({ startDate, endDate }) {
  return useQuery({
    queryKey: ["status-breakdown", startDate, endDate],
    queryFn: () => fetchStatusBreakdown({ startDate, endDate }),
  });
}

export function useLowStock(threshold) {
  return useQuery({
    queryKey: ["low-stock", threshold],
    queryFn: () => fetchLowStock({ threshold }),
  });
}

export function usePaymentSummary({ startDate, endDate }) {
  return useQuery({
    queryKey: ["payment-summary", startDate, endDate],
    queryFn: () => fetchPaymentSummary({ startDate, endDate }),
  });
}

export function useFulfillment({ startDate, endDate }) {
  return useQuery({
    queryKey: ["fulfillment", startDate, endDate],
    queryFn: () => fetchFulfillment({ startDate, endDate }),
  });
}
