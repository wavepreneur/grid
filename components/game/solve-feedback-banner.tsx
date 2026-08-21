"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { playPlaySfx } from "@/lib/grid/play-sfx";

export type SolveFeedbackState = {
  id: number;
  kind: "wrong" | "correct";
  message?: string | null;
  /** Echo of what the player just submitted (shown on wrong). */
  attemptedAnswer?: string | null;
  /** When true, SyncModal owns the celebration SFX — skip correct chime. */
  deferSound?: boolean;
};

type Props = {
  feedback: SolveFeedbackState | null;
};

/** Inline banner under the answer form — shake/pop + optional SFX. */
export function SolveFeedbackBanner({ feedback }: Props) {
  useEffect(() => {
    if (!feedback) return;
    if (feedback.kind === "wrong") playPlaySfx("wrong");
    else if (!feedback.deferSound) playPlaySfx("correct");
  }, [feedback]);

  if (!feedback) return null;

  if (feedback.kind === "wrong") {
    return (
      <div
        key={feedback.id}
        className="cg-animate-pop-in flex items-start gap-3 rounded-2xl bg-[var(--cg-destructive)]/12 px-4 py-3.5 text-left ring-2 ring-[var(--cg-destructive)]/35"
        role="alert"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cg-destructive)] text-white">
          <X className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-bold text-[var(--cg-destructive)]">Noch nicht richtig</p>
          {feedback.attemptedAnswer?.trim() ? (
            <p className="mt-1 text-sm leading-snug text-[var(--cg-fg)]">
              Eure Eingabe:{" "}
              <span className="font-bold tracking-wide">{feedback.attemptedAnswer.trim()}</span>
            </p>
          ) : null}
          <p className="mt-0.5 text-sm leading-snug text-[var(--cg-muted)]">
            {feedback.attemptedAnswer?.trim()
              ? "Versucht es erneut."
              : feedback.message?.trim() || "Probiert es weiter — ihr schafft das."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      key={feedback.id}
      className="cg-animate-pop-in flex items-center gap-3 rounded-2xl bg-[var(--cg-success)]/15 px-4 py-3.5 ring-2 ring-[var(--cg-success)]/40"
      role="status"
    >
      <span className="cg-animate-key-turn flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cg-success)] text-white">
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <p className="text-sm font-bold text-[var(--cg-fg)]">Richtig — stark!</p>
    </div>
  );
}
