"use client";

import { useEffect } from "react";
import { GridButton } from "@/components/grid/grid-shell";
import { IconCheck } from "@/components/cms/studio-icons";

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

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        {mode === "confirm" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
              Tipp freischalten
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Tipp für „{label}"</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Es werden{" "}
              <span className="font-semibold text-slate-900">{hintCost} Punkte</span> von eurem
              Score abgezogen.
            </p>
            {!canAfford ? (
              <p className="mt-3 text-sm text-red-600">
                Nicht genug Punkte (habt {score}, benötigt {hintCost}).
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <GridButton
                type="button"
                disabled={isPending || !canAfford}
                onClick={onConfirm}
              >
                {isPending ? "Wird geladen…" : `${hintCost}P abziehen & anzeigen`}
              </GridButton>
              <GridButton type="button" variant="secondary" disabled={isPending} onClick={onClose}>
                Abbrechen
              </GridButton>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Tipp freigeschaltet
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{label}</h3>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <IconCheck size={16} />
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-700 whitespace-pre-line">{hintText}</p>
            <GridButton type="button" className="mt-5 w-full sm:w-auto" onClick={onClose}>
              Schließen
            </GridButton>
          </>
        )}
      </div>
    </div>
  );
}
