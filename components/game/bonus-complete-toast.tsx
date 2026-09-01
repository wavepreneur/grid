"use client";

import { useEffect, useRef, useState } from "react";
import { IconGift } from "@/components/game/city/icons";
import { hasSeenBonusResult } from "@/components/game/bonus-spectator-view";
import type { BonusNoticeState } from "@/lib/grid/game-state";
import { playPlaySfx } from "@/lib/grid/play-sfx";

type Props = {
  notice: BonusNoticeState | null | undefined;
  /** Persist dismiss so remounts / phase changes do not re-show the same toast. */
  onDismiss?: (noticeId: string) => void;
};

function noticeSeenKey(id: string) {
  return `grid:bonus-notice-seen:${id}`;
}

function hasSeenNotice(id: string): boolean {
  try {
    return sessionStorage.getItem(noticeSeenKey(id)) === "1";
  } catch {
    return false;
  }
}

function markNoticeSeen(id: string) {
  try {
    sessionStorage.setItem(noticeSeenKey(id), "1");
  } catch {
    /* private / blocked storage */
  }
}

/**
 * Short team-wide banner after a bonus is finished — does not block play.
 */
export function BonusCompleteToast({ notice, onDismiss }: Props) {
  const seenRef = useRef<string | null>(null);
  const [visible, setVisible] = useState<BonusNoticeState | null>(null);

  useEffect(() => {
    if (!notice?.id) return;
    if (seenRef.current === notice.id) return;
    if (hasSeenNotice(notice.id) || hasSeenBonusResult(notice.bonus_id)) {
      seenRef.current = notice.id;
      return;
    }
    seenRef.current = notice.id;
    markNoticeSeen(notice.id);
    playPlaySfx(notice.correct ? "correct" : "ping");
    setVisible(notice);
  }, [notice]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      const id = visible.id;
      setVisible(null);
      onDismiss?.(id);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[110] flex justify-center px-4">
      <div
        role="status"
        className={`cg-animate-pop-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-[var(--cg-card)] px-4 py-3 shadow-[var(--cg-shadow-lift)] ring-1 ${
          visible.correct
            ? "ring-[var(--cg-accent)]/40"
            : "ring-[var(--cg-destructive)]/35"
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            visible.correct
              ? "bg-[var(--cg-accent)] text-[var(--cg-accent-fg)]"
              : "bg-[var(--cg-destructive)] text-white"
          }`}
        >
          <IconGift size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cg-muted)]">
            Bonus erledigt
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--cg-fg)]">
            {visible.correct
              ? `${visible.by} hat ${visible.reward} Punkte gerade geholt`
              : `${visible.by} konnte die Aufgabe nicht beantworten`}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-bold text-[var(--cg-muted)]"
          onClick={() => {
            const id = visible.id;
            setVisible(null);
            onDismiss?.(id);
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
