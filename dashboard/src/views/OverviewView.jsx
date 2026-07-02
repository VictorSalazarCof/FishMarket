import { Suspense, lazy } from "react";
import { useOutletContext } from "react-router-dom";
import KpiTile from "../components/KpiTile";
import LowStockTable from "../components/LowStockTable";
import PaymentTable from "../components/PaymentTable";
import { ChartSkeleton } from "../components/Skeleton";
import StatusBreakdown from "../components/StatusBreakdown";
import FulfillmentTable from "../components/FulfillmentTable";
import { fmtInt, fmtMoneyFull } from "../format";

const AnalyticsPanel = lazy(() => import("../components/AnalyticsPanel"));

export default function OverviewView() {
  const { sales, trends, status, lowStock, payment, fulfillment } = useOutletContext();

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<ChartSkeleton />}>
        <AnalyticsPanel sales={sales.data} growthRate={trends.data?.insights.growthRate} loading={sales.loading} />
      </Suspense>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile
          label="Total Revenue"
          numericValue={sales.data?.summary.totalRevenue}
          format={fmtMoneyFull}
          foot={sales.data ? `${fmtInt(sales.data.summary.totalOrders)} pedidos` : ""}
          growth={trends.data?.insights.growthRate}
          delay={0}
        />
        <KpiTile
          label="Orders"
          numericValue={sales.data?.summary.totalOrders}
          format={fmtInt}
          foot={sales.data ? `${fmtInt(sales.data.summary.totalItemsSold)} ítems vendidos` : ""}
          delay={40}
        />
        <KpiTile
          label="Average Ticket"
          numericValue={sales.data?.summary.averageOrderValue}
          format={fmtMoneyFull}
          delay={80}
        />
        <KpiTile
          label="Fulfillment Rate"
          numericValue={fulfillment.data ? fulfillment.data.metrics.fulfillmentRate * 100 : undefined}
          format={(n) => `${n.toFixed(1)}%`}
          foot={fulfillment.data ? `${fmtInt(fulfillment.data.metrics.totalShipments)} envíos` : ""}
          delay={120}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusBreakdown data={status.data} loading={status.loading} error={status.error} />
        <PaymentTable data={payment.data} loading={payment.loading} error={payment.error} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LowStockTable data={lowStock.data} loading={lowStock.loading} error={lowStock.error} />
        <FulfillmentTable data={fulfillment.data} loading={fulfillment.loading} error={fulfillment.error} />
      </div>
    </div>
  );
}
