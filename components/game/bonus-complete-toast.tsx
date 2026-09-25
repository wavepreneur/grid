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
 * Solid top banner after a bonus is finished — slides in, then leaves on its own.
 */
export function BonusCompleteToast({ notice, onDismiss }: Props) {
  const seenRef = useRef<string | null>(null);
  const [visible, setVisible] = useState<BonusNoticeState | null>(null);
  const [leaving, setLeaving] = useState(false);

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
    setLeaving(false);
    setVisible(notice);
  }, [notice]);

  useEffect(() => {
    if (!visible) return;
    const hide = window.setTimeout(() => setLeaving(true), 4000);
    return () => window.clearTimeout(hide);
  }, [visible]);

  useEffect(() => {
    if (!visible || !leaving) return;
    const done = window.setTimeout(() => {
      const id = visible.id;
      setVisible(null);
      setLeaving(false);
      onDismiss?.(id);
    }, 280);
    return () => window.clearTimeout(done);
  }, [visible, leaving, onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[110] ${
        leaving ? "cg-animate-slide-up" : "cg-animate-slide-down"
      } ${
        visible.correct
          ? "bg-[var(--cg-success)] text-white"
          : "bg-[var(--cg-primary)] text-[var(--cg-primary-fg)]"
      }`}
    >
      <div className="mx-auto flex w-full max-w-md items-start gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
          <IconGift size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-80">
            Bonus erledigt
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            {visible.correct
              ? `${visible.by} hat ${visible.reward} Punkte gerade geholt`
              : `${visible.by} konnte die Aufgabe nicht beantworten`}
          </p>
        </div>
      </div>
    </div>
  );
}
