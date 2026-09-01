"use client";

import { useEffect } from "react";
import { PartyPopper } from "lucide-react";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { playPlaySfx } from "@/lib/grid/play-sfx";
import type { GameModalState } from "@/lib/grid/game-state";
import { TeamPaceHint } from "@/components/game/team-pace-hint";

type SyncModalProps = {
  modal: GameModalState;
  onDismiss: () => void;
  isPending?: boolean;
  canPaceTeam?: boolean;
  leadLabel?: string;
};

export function SyncModal({
  modal,
  onDismiss,
  isPending,
  canPaceTeam = false,
  leadLabel = "Team Lead",
}: SyncModalProps) {
  const points =
    modal.points_earned !== undefined
      ? `${modal.points_earned >= 0 ? "+" : ""}${modal.points_earned} Punkte`
      : null;
  const hasNote = Boolean(modal.body?.trim());

  useEffect(() => {
    playPlaySfx(hasNote ? "success" : "correct");
  }, [modal.id, hasNote]);

  return (
    <div className="city-game fixed inset-0 z-[120] flex items-center justify-center bg-[var(--cg-ink)]/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-modal-title"
        className="cg-animate-rise-in relative w-full max-w-md overflow-hidden rounded-[1.75rem] bg-[var(--cg-card)] p-6 text-center shadow-[var(--cg-shadow-lift)] sm:p-8"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[var(--cg-success)]/20 blur-2xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -right-6 h-36 w-36 rounded-full bg-[var(--cg-accent)]/25 blur-2xl"
        />

        <span className="cg-animate-celebrate relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--cg-success)] text-white shadow-[var(--cg-shadow-lift)]">
          <PartyPopper className="h-10 w-10" strokeWidth={2} />
        </span>

        <p className="cg-animate-pop-in relative mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--cg-success)]">
          Aufgabe geschafft
        </p>
        <h2
          id="sync-modal-title"
          className="cg-animate-pop-in relative mt-2 text-3xl font-bold text-[var(--cg-fg)]"
          style={{ animationDelay: "60ms" }}
        >
          {hasNote ? "Gelöst!" : modal.message}
        </h2>

        {points ? (
          <p
            className="cg-animate-pop-in relative mt-2 text-lg font-bold text-[var(--cg-fg)]"
            style={{ animationDelay: "100ms" }}
          >
            {points}
          </p>
        ) : null}

        <p className="relative mt-1 text-sm text-[var(--cg-muted)]">
          Aufgabe {modal.level}
          {modal.solved_by.length > 0 ? <> · {modal.solved_by.join(", ")}</> : null}
        </p>

        {hasNote ? (
          <div
            className="cg-animate-rise-in relative mt-6 rounded-3xl bg-[var(--cg-secondary)] px-5 py-5 text-left"
            style={{ animationDelay: "140ms" }}
          >
            <SectionLabel>{modal.message}</SectionLabel>
            <p className="mt-2 text-xl font-bold leading-snug text-[var(--cg-fg)]">
              „{modal.body}“
            </p>
          </div>
        ) : null}

        <div className="relative mt-8">
          {canPaceTeam ? (
            <BigButton variant="accent" disabled={isPending} onClick={onDismiss}>
              Weiter
            </BigButton>
          ) : (
            <TeamPaceHint canPaceTeam={false} leadLabel={leadLabel} />
          )}
        </div>
      </div>
    </div>
  );
}
