"use client";

type GameGateSkeletonProps = {
  title?: string;
  subtitle?: string;
  /** 0–100. When set, the bar fills instead of sliding endlessly. */
  progress?: number;
};

export function GameGateSkeleton({
  title = "Mission wird aufgebaut…",
  subtitle = "Inhalt und Team-Stand werden geladen. Bitte einen Moment Geduld.",
  progress,
}: GameGateSkeletonProps) {
  const hasProgress = typeof progress === "number" && Number.isFinite(progress);
  const pct = hasProgress ? Math.max(4, Math.min(100, progress)) : null;

  return (
    <div
      className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-14 w-14 animate-spin rounded-full border-[3px] border-slate-200 border-t-teal-600"
        aria-hidden
      />
      <h1 className="mt-6 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{subtitle}</p>
      <div
        className="mt-8 h-2.5 w-full max-w-sm overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ? Math.round(pct) : undefined}
      >
        {pct != null ? (
          <div
            className="h-full rounded-full bg-teal-600 transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="cg-animate-busy-slide h-full w-1/2 rounded-full bg-teal-600" />
        )}
      </div>
      {pct != null ? (
        <p className="mt-3 text-sm font-semibold tabular-nums text-teal-700">
          {Math.round(pct)} %
        </p>
      ) : null}
      <p className="mt-4 text-xs font-medium text-slate-400">
        Draußen dauert das manchmal ein paar Sekunden — bitte nicht neu laden.
      </p>
    </div>
  );
}
