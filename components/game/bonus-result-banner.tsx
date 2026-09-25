"use client";

import { Check, X } from "lucide-react";
import { IconGift } from "@/components/game/city/icons";

type Props = {
  leaving: boolean;
  /** null = still in progress (spectator). */
  correct: boolean | null;
  headline: string;
  detail?: string | null;
};

/**
 * Same card as the in-task bonus result — solid cream so HUD chrome cannot
 * bleed through (this banner lives outside `.city-game`).
 */
export function BonusResultBanner({ leaving, correct, headline, detail }: Props) {
  const failed = correct === false;
  const inProgress = correct === null;

  return (
    <div
      role="status"
      className={`city-game fixed inset-x-0 top-0 z-[200] bg-[var(--cg-bg)] ${
        leaving ? "cg-animate-slide-up" : "cg-animate-slide-down"
      }`}
    >
      <div className="mx-auto w-full max-w-md px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div
          className={`flex items-start gap-3 rounded-2xl bg-[var(--cg-card)] px-4 py-3.5 text-left shadow-[var(--cg-shadow-lift)] ring-2 ${
            failed
              ? "ring-[var(--cg-destructive)]/35"
              : "ring-[var(--cg-success)]/40"
          }`}
        >
          {inProgress ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cg-accent)] text-[var(--cg-accent-fg)]">
              <IconGift size={18} />
            </span>
          ) : failed ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cg-destructive)] text-white">
              <X className="h-4 w-4" strokeWidth={2.5} />
            </span>
          ) : (
            <span className="cg-animate-key-turn flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cg-success)] text-white">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
          )}
          <div className="min-w-0 pt-0.5">
            <p
              className={`text-sm font-bold ${
                failed ? "text-[var(--cg-destructive)]" : "text-[var(--cg-fg)]"
              }`}
            >
              {headline}
            </p>
            {detail ? (
              <p className="mt-0.5 text-sm text-[var(--cg-muted)]">{detail}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
