"use client";

import { useEffect, useRef } from "react";
import { CityTeamBar } from "@/components/game/city/team-bar";
import { IconGift } from "@/components/game/city/icons";
import { SectionLabel } from "@/components/game/city/ui";
import type { BonusRevealState } from "@/lib/grid/game-state";
import { playPlaySfx } from "@/lib/grid/play-sfx";

export type BonusSpectatorItem = {
  bonusId: string;
  solverName: string;
  reveal: BonusRevealState | null;
};

type Props = {
  items: BonusSpectatorItem[];
  teamName: string;
  myName: string;
  myRoleLabel: string;
  isPending: boolean;
  onContinue: (bonusId: string) => void;
};

const BONUS_ADVANCE_MS = 2800;

/**
 * Role-only bonus: everyone else sees who is solving — then the result.
 */
export function BonusSpectatorView({
  items,
  teamName,
  myName,
  myRoleLabel,
  isPending,
  onContinue,
}: Props) {
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;
  const advancedRef = useRef<Set<string>>(new Set());
  const sfxRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const item of items) {
      const reveal = item.reveal;
      if (!reveal) continue;
      if (!sfxRef.current.has(reveal.revealed_at)) {
        sfxRef.current.add(reveal.revealed_at);
        playPlaySfx(reveal.correct ? "correct" : "wrong");
      }
    }
  }, [items]);

  useEffect(() => {
    if (isPending) return;
    const timers: number[] = [];
    for (const item of items) {
      const reveal = item.reveal;
      if (!reveal) continue;
      if (advancedRef.current.has(reveal.revealed_at)) continue;
      const timer = window.setTimeout(() => {
        if (advancedRef.current.has(reveal.revealed_at)) return;
        advancedRef.current.add(reveal.revealed_at);
        onContinueRef.current(item.bonusId);
      }, BONUS_ADVANCE_MS);
      timers.push(timer);
    }
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [items, isPending]);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col px-4 pb-[max(2rem,calc(1rem+env(safe-area-inset-bottom)))] pt-5 sm:px-5">
      <CityTeamBar teamName={teamName} meName={myName} meRoleLabel={myRoleLabel} compact />

      <div className="mt-10 flex flex-col items-center text-center">
        <span className="cg-animate-pop-in flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--cg-accent)] text-[var(--cg-accent-fg)] shadow-[var(--cg-shadow-lift)]">
          <IconGift size={40} />
        </span>
        <SectionLabel>Bonusaufgabe</SectionLabel>
      </div>

      <div className="mt-8 space-y-4">
        {items.map((item) => {
          const reveal = item.reveal;
          return (
            <div
              key={item.bonusId}
              className="rounded-3xl bg-[var(--cg-card)] px-5 py-5 text-center shadow-[var(--cg-shadow-soft)]"
              role="status"
            >
              {reveal ? (
                reveal.correct ? (
                  <>
                    <p className="text-lg font-bold text-[var(--cg-fg)]">
                      {item.solverName} hat {reveal.reward} Punkte gerade geholt
                    </p>
                    <p className="mt-2 text-sm text-[var(--cg-muted)]">
                      +{reveal.reward} Punkte für das Team.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-[var(--cg-destructive)]">
                      {item.solverName} konnte die Aufgabe nicht beantworten
                    </p>
                    <p className="mt-2 text-sm text-[var(--cg-muted)]">
                      Keine Extra-Punkte — es geht weiter.
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className="text-lg font-bold text-[var(--cg-fg)]">
                    {item.solverName} löst gerade eine Bonusaufgabe
                  </p>
                  <p className="mt-2 text-sm text-[var(--cg-muted)]">
                    Ihr könnt warten — das Ergebnis erscheint gleich hier.
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
