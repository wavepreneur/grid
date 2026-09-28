"use client";

import { playUi } from "@/lib/grid/play-ui";

type Props = {
  requiredMeters: number;
  walkedMeters: number;
  onAddMeters: () => void;
  onShowNow: () => void;
  language?: string | null;
};

export function StudioDeskTestBar({
  requiredMeters,
  walkedMeters,
  onAddMeters,
  onShowNow,
  language,
}: Props) {
  const t = playUi(language);
  const walked = Math.min(requiredMeters, Math.max(0, Math.round(walkedMeters)));
  return (
    <div className="mx-4 mb-3 rounded-2xl border border-[var(--cg-primary)]/30 bg-[var(--cg-primary)]/10 px-4 py-3">
      <p className="text-sm font-semibold text-[var(--cg-fg)]">{t.desk.title(requiredMeters)}</p>
      <p className="mt-0.5 text-xs leading-5 text-[var(--cg-muted)]">
        {t.desk.hint(walked, requiredMeters)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddMeters}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--cg-fg)] shadow-sm"
        >
          {t.hub.simulateWalk}
        </button>
        <button
          type="button"
          onClick={onShowNow}
          className="rounded-full bg-[var(--cg-primary)] px-3 py-1.5 text-xs font-semibold text-white"
        >
          {t.desk.showNow}
        </button>
      </div>
    </div>
  );
}
