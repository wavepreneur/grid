"use client";

import { useEffect, useRef, useState } from "react";
import { BonusResultBanner } from "@/components/game/bonus-result-banner";
import type { BonusRevealState } from "@/lib/grid/game-state";
import { playPlaySfx } from "@/lib/grid/play-sfx";

export type BonusSpectatorItem = {
  bonusId: string;
  solverName: string;
  reveal: BonusRevealState | null;
};

type Props = {
  items: BonusSpectatorItem[];
};

function dismissKey(item: BonusSpectatorItem) {
  if (item.reveal) return `grid:bonus-role:${item.bonusId}:result:${item.reveal.revealed_at}`;
  return `grid:bonus-role:${item.bonusId}:live`;
}

function resultSeenKey(bonusId: string) {
  return `grid:bonus-result-seen:${bonusId}`;
}

function hasDismissed(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markDismissed(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* private / blocked storage */
  }
}

/**
 * Role-only bonus: non-blocking toast so the rest of the team can keep playing.
 */
export function BonusSpectatorView({ items }: Props) {
  const sfxRef = useRef<Set<string>>(new Set());
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set());

  const visible = items.find((item) => {
    const key = dismissKey(item);
    if (hiddenKeys.has(key) || hasDismissed(key)) return false;
    return true;
  });

  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    for (const item of items) {
      const reveal = item.reveal;
      if (!reveal) continue;
      markDismissed(resultSeenKey(item.bonusId));
      if (!sfxRef.current.has(reveal.revealed_at)) {
        sfxRef.current.add(reveal.revealed_at);
        playPlaySfx(reveal.correct ? "correct" : "wrong");
      }
    }
  }, [items]);

  useEffect(() => {
    if (!visible?.reveal) {
      setLeaving(false);
      return;
    }
    setLeaving(false);
    const hide = window.setTimeout(() => setLeaving(true), 4000);
    return () => window.clearTimeout(hide);
  }, [visible?.bonusId, visible?.reveal?.revealed_at]);

  useEffect(() => {
    if (!visible?.reveal || !leaving) return;
    const done = window.setTimeout(() => {
      const key = dismissKey(visible);
      markDismissed(key);
      markDismissed(resultSeenKey(visible.bonusId));
      setHiddenKeys((prev) => new Set(prev).add(key));
      setLeaving(false);
    }, 280);
    return () => window.clearTimeout(done);
  }, [visible, leaving]);

  if (!visible) return null;

  const reveal = visible.reveal;

  return (
    <BonusResultBanner
      leaving={Boolean(reveal && leaving)}
      correct={reveal ? reveal.correct : null}
      headline={
        reveal
          ? reveal.correct
            ? `${visible.solverName} hat ${reveal.reward} Punkte gerade geholt`
            : `${visible.solverName} konnte die Aufgabe nicht beantworten`
          : `${visible.solverName} löst gerade eine Bonusaufgabe`
      }
      detail={
        reveal
          ? reveal.correct
            ? `+${reveal.reward} Punkte für das Team.`
            : "Keine Extra-Punkte."
          : null
      }
    />
  );
}

export function hasSeenBonusResult(bonusId: string | undefined): boolean {
  if (!bonusId) return false;
  return hasDismissed(resultSeenKey(bonusId));
}
