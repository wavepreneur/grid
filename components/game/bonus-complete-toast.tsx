"use client";

import { useEffect, useRef, useState } from "react";
import { BonusResultBanner } from "@/components/game/bonus-result-banner";
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
 * Solid top card after a bonus is finished — same look as the in-task result.
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
    <BonusResultBanner
      leaving={leaving}
      correct={visible.correct}
      headline={
        visible.skipped
          ? `${visible.by} hat die Bonusaufgabe übersprungen`
          : visible.correct
            ? `${visible.by} hat ${visible.reward} Punkte gerade geholt`
            : `${visible.by} konnte die Aufgabe nicht beantworten`
      }
      detail={
        visible.correct
          ? `+${visible.reward} Punkte für das Team.`
          : "0 Extra-Punkte."
      }
    />
  );
}
