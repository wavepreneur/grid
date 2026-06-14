"use client";

import { useEffect } from "react";
import { GridButton } from "@/components/grid/grid-shell";
import type { GameModalState } from "@/lib/grid/game-state";

type SyncModalProps = {
  modal: GameModalState;
  onDismiss: () => void;
  isPending?: boolean;
};

export function SyncModal({ modal, onDismiss, isPending }: SyncModalProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [modal.id, onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="grid-panel w-full max-w-md p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--grid-accent)]">
          Sync
        </p>
        <h2 className="mt-4 text-3xl font-semibold text-white">{modal.message}</h2>
        <p className="mt-3 text-sm text-[var(--grid-muted)]">
          Level {modal.level} abgeschlossen
        </p>
        <p className="mt-2 text-sm text-white">
          Gelöst von: {modal.solved_by.join(", ")}
        </p>
        <GridButton
          type="button"
          className="mt-8"
          disabled={isPending}
          onClick={onDismiss}
        >
          {isPending ? "Synchronisiere…" : "Weiter"}
        </GridButton>
      </div>
    </div>
  );
}
