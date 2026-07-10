"use client";

import { useEffect } from "react";
import { GridButton } from "@/components/grid/grid-shell";
import { IconCheck } from "@/components/cms/studio-icons";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <IconCheck size={24} />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-teal-600">
          Aufgabe geschafft
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{modal.message}</h2>
        <p className="mt-3 text-sm text-slate-500">Aufgabe {modal.level} abgeschlossen</p>
        <p className="mt-2 text-sm text-slate-600">
          Gelöst von: <strong>{modal.solved_by.join(", ")}</strong>
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
