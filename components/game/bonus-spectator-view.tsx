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

  function dismiss(item: BonusSpectatorItem) {
    const key = dismissKey(item);
    markDismissed(key);
    if (item.reveal) markDismissed(resultSeenKey(item.bonusId));
    setHiddenKeys((prev) => new Set(prev).add(key));
  }

  if (!visible) return null;

  const reveal = visible.reveal;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[110] flex justify-center px-4">
      <div
        role="status"
        className={`cg-animate-pop-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-[var(--cg-card)] px-4 py-3 shadow-[var(--cg-shadow-lift)] ring-1 ${
          reveal
            ? reveal.correct
              ? "ring-[var(--cg-accent)]/40"
              : "ring-[var(--cg-destructive)]/35"
            : "ring-[var(--cg-accent)]/40"
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            reveal && !reveal.correct
              ? "bg-[var(--cg-destructive)] text-white"
              : "bg-[var(--cg-accent)] text-[var(--cg-accent-fg)]"
          }`}
        >
          <IconGift size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cg-muted)]">
            Bonusaufgabe
          </p>
          {reveal ? (
            <p className="mt-0.5 text-sm font-semibold text-[var(--cg-fg)]">
              {reveal.correct
                ? `${visible.solverName} hat ${reveal.reward} Punkte gerade geholt`
                : `${visible.solverName} konnte die Aufgabe nicht beantworten`}
            </p>
          ) : (
            <>
              <p className="mt-0.5 text-sm font-semibold text-[var(--cg-fg)]">
                {visible.solverName} löst gerade eine Bonusaufgabe
              </p>
              <p className="mt-0.5 text-xs text-[var(--cg-muted)]">
                Ihr könnt weitermachen — das Ergebnis erscheint hier.
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-bold text-[var(--cg-muted)]"
          onClick={() => dismiss(visible)}
        >
          OK
        </button>
      </div>
    </div>
  );
}

export function hasSeenBonusResult(bonusId: string | undefined): boolean {
  if (!bonusId) return false;
  return hasDismissed(resultSeenKey(bonusId));
}
