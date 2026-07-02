function Shimmer({ className }) {
  return <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />;
}

export function KpiTileSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Shimmer className="h-3 w-20" />
      <Shimmer className="mt-3 h-7 w-28" />
      <Shimmer className="mt-2 h-3 w-16" />
    </div>
  );
}

export function PanelSkeleton({ rows = 4 }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Shimmer className="h-3.5 w-40" />
      <Shimmer className="mt-2 h-3 w-56" />
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <Shimmer key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-3xl bg-slate-100 p-7">
      <Shimmer className="h-3 w-48 bg-slate-200" />
      <Shimmer className="mt-3 h-10 w-40 bg-slate-200" />
      <Shimmer className="mt-6 h-56 w-full bg-slate-200" />
    </div>
  );
}

export default Shimmer;
