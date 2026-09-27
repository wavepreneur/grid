"use client";

import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { BigButton, SectionLabel } from "@/components/game/city/ui";

type Props = {
  disabled?: boolean;
  /** Called only after the player confirms in the modal. */
  onConfirmReveal: () => void;
};

/**
 * Secondary escape hatch under the solve form — quiet, not a primary CTA.
 * Requires confirmation so an accidental tap does not end the task at 0 points.
 */
export function RevealSolutionControl({ disabled = false, onConfirmReveal }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!confirmOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmOpen(false);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmOpen]);

  return (
    <>
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-[var(--cg-border)]" />
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--cg-muted)]">
            oder
          </span>
          <span className="h-px flex-1 bg-[var(--cg-border)]" />
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setConfirmOpen(true)}
          className="cg-tap-lift flex w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5 text-left transition hover:border-[var(--cg-muted)]/50 hover:bg-[var(--cg-secondary)]/60 disabled:opacity-40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cg-secondary)] text-[var(--cg-muted)]">
            <Flag className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--cg-muted)]">
              Stecken fest
            </span>
            <span className="mt-0.5 block text-base font-semibold text-[var(--cg-fg)]">
              Lösung anzeigen
            </span>
            <span className="mt-0.5 block text-sm text-[var(--cg-muted)]">
              Aufgabe zählt mit 0 Punkten
            </span>
          </span>
        </button>
      </div>

      {confirmOpen ? (
        <div
          className="city-game fixed inset-0 z-[2000] flex items-end justify-center bg-[var(--cg-ink)]/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setConfirmOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reveal-solution-title"
            className="cg-animate-rise-in w-full max-w-md space-y-4 rounded-[1.5rem] bg-[var(--cg-card)] p-5 shadow-[var(--cg-shadow-lift)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--cg-secondary)] text-[var(--cg-fg)]">
                <Flag className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div>
                <SectionLabel>Aufgeben</SectionLabel>
                <p id="reveal-solution-title" className="font-bold text-[var(--cg-fg)]">
                  Lösung anzeigen?
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-[var(--cg-muted)]">
              Die Aufgabe gilt danach als erledigt, bringt aber{" "}
              <span className="font-bold text-[var(--cg-fg)]">0 Punkte</span>. Das lässt sich nicht
              rückgängig machen.
            </p>

            <BigButton
              variant="accent"
              onClick={() => {
                setConfirmOpen(false);
                onConfirmReveal();
              }}
            >
              OK — Lösung anzeigen
            </BigButton>
            <BigButton variant="ghost" onClick={() => setConfirmOpen(false)}>
              Zurück zum Rätsel
            </BigButton>
          </div>
        </div>
      ) : null}
    </>
  );
}
