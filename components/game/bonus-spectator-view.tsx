"use client";

import { useEffect, useRef } from "react";
import { BigButton } from "@/components/game/city/ui";
import { CityTeamBar } from "@/components/game/city/team-bar";
import { IconGift } from "@/components/game/city/icons";
import { SectionLabel } from "@/components/game/city/ui";
import { TeamPaceHint } from "@/components/game/team-pace-hint";
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
  canPaceTeam?: boolean;
  leadLabel?: string;
  onContinue: (bonusId: string) => void;
};

/**
 * Role-only bonus: everyone else sees who is solving — then the result.
 * Team lead confirms before the team leaves this screen.
 */
export function BonusSpectatorView({
  items,
  teamName,
  myName,
  myRoleLabel,
  isPending,
  canPaceTeam = false,
  leadLabel = "Team Lead",
  onContinue,
}: Props) {
  const sfxRef = useRef<Set<string>>(new Set());
  const revealedItem = items.find((item) => item.reveal) ?? items[0];

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

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col bg-[var(--cg-bg)] px-4 pb-[max(2rem,calc(1rem+env(safe-area-inset-bottom)))] pt-5 sm:px-5">
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
                      Keine Extra-Punkte. {leadLabel} geht weiter, wenn ihr soweit seid.
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className="text-lg font-bold text-[var(--cg-fg)]">
                    {item.solverName} löst gerade eine Bonusaufgabe
                  </p>
                  <p className="mt-2 text-sm text-[var(--cg-muted)]">
                    Das Ergebnis erscheint hier — ihr bleibt auf diesem Bildschirm.
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {revealedItem?.reveal ? (
        <div className="mt-auto space-y-3 pt-8">
          {canPaceTeam ? (
            <BigButton
              disabled={isPending}
              onClick={() => onContinue(revealedItem.bonusId)}
            >
              Weiter
            </BigButton>
          ) : (
            <TeamPaceHint canPaceTeam={false} leadLabel={leadLabel} />
          )}
        </div>
      ) : null}
    </section>
  );
}
