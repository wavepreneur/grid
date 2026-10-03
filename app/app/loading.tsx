export default function AdminLoading() {
  return (
    <div className="studio-main flex-1 px-6 py-8 lg:px-10">
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 rounded-lg bg-slate-200/80" />
        <div className="h-24 rounded-2xl bg-slate-200/80" />
        <div className="space-y-3">
          <div className="h-20 rounded-2xl bg-slate-200/80" />
          <div className="h-20 rounded-2xl bg-slate-200/80" />
          <div className="h-20 rounded-2xl bg-slate-200/80" />
        </div>
      </div>
    </div>
  );
}
