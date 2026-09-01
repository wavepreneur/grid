"use client";

import { useEffect } from "react";
import { Check, Lightbulb } from "lucide-react";
import { BigButton } from "@/components/game/city/ui";

type TileHintModalProps = {
  open: boolean;
  mode: "confirm" | "view";
  label: string;
  hintText?: string;
  hintCost: number;
  score: number;
  isPending?: boolean;
  canAfford?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
};

export function TileHintModal({
  open,
  mode,
  label,
  hintText,
  hintCost,
  score,
  isPending = false,
  canAfford = true,
  onConfirm,
  onClose,
}: TileHintModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="city-game fixed inset-0 z-[2000] flex items-end justify-center bg-[var(--cg-ink)]/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="cg-animate-rise-in w-full max-w-md space-y-4 rounded-[1.5rem] bg-[var(--cg-card)] p-5 shadow-[var(--cg-shadow-lift)]"
        onClick={(event) => event.stopPropagation()}
      >
        {mode === "confirm" ? (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--cg-accent)] text-[var(--cg-accent-fg)]">
                <Lightbulb className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cg-muted)]">
                  Tipp freischalten
                </p>
                <p className="font-bold text-[var(--cg-fg)]">{label}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-[var(--cg-muted)]">
              Kostet{" "}
              <span className="font-bold text-[var(--cg-fg)]">{hintCost} Punkte</span> vom
              Team-Score. Pro Kachel gibt es einen Tipp.
            </p>
            {!canAfford ? (
              <p className="text-sm font-semibold text-[var(--cg-destructive)]">
                Nicht genug Punkte (habt {score}, braucht {hintCost}).
              </p>
            ) : null}
            <BigButton
              variant="accent"
              disabled={isPending || !canAfford}
              onClick={onConfirm}
            >
              {isPending ? "Wird geladen…" : "Freischalten & anzeigen"}
            </BigButton>
            <BigButton variant="ghost" disabled={isPending} onClick={onClose}>
              Abbrechen
            </BigButton>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--cg-success)] text-white">
                <Check className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cg-success)]">
                  Tipp freigeschaltet
                </p>
                <p className="font-bold text-[var(--cg-fg)]">{label}</p>
              </div>
            </div>
            <p className="text-base font-semibold leading-relaxed text-[var(--cg-fg)] whitespace-pre-line">
              {hintText}
            </p>
            <BigButton variant="ghost" onClick={onClose}>
              Verstanden
            </BigButton>
          </>
        )}
      </div>
    </div>
  );
}
