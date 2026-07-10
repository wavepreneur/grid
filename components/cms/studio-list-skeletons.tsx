export function StudioListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-12 rounded-xl bg-slate-200/80" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-20 rounded-2xl bg-slate-200/80" />
      ))}
    </div>
  );
}

export function StudioOverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-slate-200/80" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-2xl bg-slate-200/80" />
        <div className="h-64 rounded-2xl bg-slate-200/80" />
      </div>
    </div>
  );
}
