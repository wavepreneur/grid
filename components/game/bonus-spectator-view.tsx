"use client";

import { useEffect, useRef, useState } from "react";
import { IconGift } from "@/components/game/city/icons";
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
  const failed = Boolean(reveal && !reveal.correct);

  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[110] ${
        leaving ? "cg-animate-slide-up" : "cg-animate-slide-down"
      } ${
        failed
          ? "bg-[var(--cg-primary)] text-[var(--cg-primary-fg)]"
          : "bg-[var(--cg-success)] text-white"
      }`}
    >
      <div className="mx-auto flex w-full max-w-md items-start gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
          <IconGift size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-80">
            {reveal ? "Bonus erledigt" : "Bonusaufgabe"}
          </p>
          {reveal ? (
            <p className="mt-0.5 text-sm font-semibold">
              {reveal.correct
                ? `${visible.solverName} hat ${reveal.reward} Punkte gerade geholt`
                : `${visible.solverName} konnte die Aufgabe nicht beantworten`}
            </p>
          ) : (
            <p className="mt-0.5 text-sm font-semibold">
              {visible.solverName} löst gerade eine Bonusaufgabe
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function hasSeenBonusResult(bonusId: string | undefined): boolean {
  if (!bonusId) return false;
  return hasDismissed(resultSeenKey(bonusId));
}
