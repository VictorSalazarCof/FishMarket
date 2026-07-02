import { Suspense, lazy } from "react";
import { useOutletContext } from "react-router-dom";
import { ChartSkeleton, PanelSkeleton } from "../components/Skeleton";

const AnalyticsPanel = lazy(() => import("../components/AnalyticsPanel"));
const TopMonths = lazy(() => import("../components/TopMonths"));

export default function PredictiveView() {
  const { sales, trends } = useOutletContext();
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<ChartSkeleton />}>
        <AnalyticsPanel sales={sales.data} growthRate={trends.data?.insights.growthRate} loading={sales.loading} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton rows={6} />}>
        <TopMonths />
      </Suspense>
    </div>
  );
}
