export function GameGateSkeleton() {
  return (
    <div className="mx-auto max-w-lg animate-pulse space-y-6 px-4 py-16">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-200" />
      <div className="mx-auto h-6 w-40 rounded-lg bg-slate-200" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-slate-200" />
        <div className="h-4 w-5/6 rounded bg-slate-200" />
      </div>
      <div className="h-48 rounded-2xl bg-slate-200" />
    </div>
  );
}
