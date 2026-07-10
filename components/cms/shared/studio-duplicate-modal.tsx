"use client";

import { useEffect, useState, type ReactNode } from "react";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { StudioButton, StudioError, StudioInput, StudioLabel } from "@/components/cms/studio-ui";

type Props = {
  open: boolean;
  onClose: () => void;
  itemLabel: string;
  selectedCount: number;
  pending?: boolean;
  error?: string | null;
  extra?: ReactNode;
  onConfirm: (count: number) => void;
};

export function StudioDuplicateModal({
  open,
  onClose,
  itemLabel,
  selectedCount,
  pending,
  error,
  extra,
  onConfirm,
}: Props) {
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (open) setCount(1);
  }, [open, selectedCount]);

  const totalCopies = selectedCount * count;

  return (
    <StudioModal
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title="Duplizieren"
      subtitle={
        selectedCount === 1
          ? `1 ${itemLabel} kopieren`
          : `${selectedCount} ${itemLabel} kopieren`
      }
      footer={
        <div className="flex flex-wrap gap-2">
          <StudioButton
            type="button"
            disabled={pending || count < 1 || count > 100}
            onClick={() => onConfirm(count)}
          >
            {pending
              ? "Wird dupliziert…"
              : totalCopies === 1
                ? "Duplizieren"
                : `${totalCopies} Kopien erstellen`}
          </StudioButton>
          <StudioButton type="button" variant="secondary" disabled={pending} onClick={onClose}>
            Abbrechen
          </StudioButton>
        </div>
      }
    >
      <p className="text-sm leading-6 text-slate-600">
        Wie oft soll{selectedCount === 1 ? "" : " jedes Element"} dupliziert werden? Jede Kopie
        erhält eine Nummer vor dem Titel (z. B. „1 Mein Spiel“, „2 Mein Spiel“), die du später
        anpassen kannst.
      </p>
      <div className="mt-4">
        <StudioLabel hint="Zwischen 1 und 100">Anzahl</StudioLabel>
        <StudioInput
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) setCount(Math.min(100, Math.max(1, next)));
          }}
        />
      </div>
      {selectedCount > 1 && count > 1 ? (
        <p className="mt-3 text-xs text-slate-500">
          Es werden {totalCopies} neue {itemLabel} erstellt ({selectedCount} × {count}).
        </p>
      ) : null}
      {error ? (
        <div className="mt-4">
          <StudioError message={error} />
        </div>
      ) : null}
      {extra}
    </StudioModal>
  );
}
