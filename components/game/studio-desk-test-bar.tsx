"use client";

type Props = {
  requiredMeters: number;
  walkedMeters: number;
  onAddMeters: () => void;
  onShowNow: () => void;
};

export function StudioDeskTestBar({
  requiredMeters,
  walkedMeters,
  onAddMeters,
  onShowNow,
}: Props) {
  const walked = Math.min(requiredMeters, Math.max(0, Math.round(walkedMeters)));
  return (
    <div className="mx-4 mb-3 rounded-2xl border border-[var(--cg-primary)]/30 bg-[var(--cg-primary)]/10 px-4 py-3">
      <p className="text-sm font-semibold text-[var(--cg-fg)]">Studio-Test · Bonus nach {requiredMeters} m</p>
      <p className="mt-0.5 text-xs leading-5 text-[var(--cg-muted)]">
        {walked} / {requiredMeters} m — am Tisch simulieren oder draußen laufen. Beides zählt.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddMeters}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--cg-fg)] shadow-sm"
        >
          +25 m am Tisch
        </button>
        <button
          type="button"
          onClick={onShowNow}
          className="rounded-full bg-[var(--cg-primary)] px-3 py-1.5 text-xs font-semibold text-white"
        >
          Bonus jetzt zeigen
        </button>
      </div>
    </div>
  );
}
