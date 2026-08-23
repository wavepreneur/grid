"use client";

import { useEffect, useRef, useState } from "react";
import { IconGift } from "@/components/game/city/icons";
import type { BonusNoticeState } from "@/lib/grid/game-state";
import { playPlaySfx } from "@/lib/grid/play-sfx";

type Props = {
  notice: BonusNoticeState | null | undefined;
};

/**
 * Short team-wide banner after a bonus is finished — does not block play.
 */
export function BonusCompleteToast({ notice }: Props) {
  const seenRef = useRef<string | null>(null);
  const [visible, setVisible] = useState<BonusNoticeState | null>(null);

  useEffect(() => {
    if (!notice?.id) return;
    if (seenRef.current === notice.id) return;
    seenRef.current = notice.id;
    playPlaySfx(notice.correct ? "correct" : "ping");
    setVisible(notice);
  }, [notice]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(null), 4500);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[110] flex justify-center px-4">
      <div
        role="status"
        className="cg-animate-pop-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-[var(--cg-card)] px-4 py-3 shadow-[var(--cg-shadow-lift)] ring-1 ring-[var(--cg-accent)]/40"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cg-accent)] text-[var(--cg-accent-fg)]">
          <IconGift size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cg-muted)]">
            Bonus erledigt
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--cg-fg)]">
            {visible.by} ·{" "}
            {visible.correct
              ? `+${visible.reward} Punkte fürs Team`
              : "Ohne Extrpunkte — weiter geht’s"}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-bold text-[var(--cg-muted)]"
          onClick={() => setVisible(null)}
        >
          OK
        </button>
      </div>
    </div>
  );
}
