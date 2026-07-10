"use client";

import type { ReactNode } from "react";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { StudioButton, StudioHint } from "@/components/cms/studio-ui";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  count: number;
  itemLabel: string;
  pending?: boolean;
  warnings?: ReactNode;
  extraActions?: ReactNode;
  offlineSwitch?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
  };
  confirmLabel?: string;
  onConfirm: () => void;
};

export function StudioDeleteModal({
  open,
  onClose,
  title,
  count,
  itemLabel,
  pending,
  warnings,
  extraActions,
  offlineSwitch,
  confirmLabel = "Endgültig löschen",
  onConfirm,
}: Props) {
  return (
    <StudioModal
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={title}
      subtitle={
        count === 1
          ? `1 ${itemLabel} wird gelöscht.`
          : `${count} ${itemLabel} werden gelöscht.`
      }
      footer={
        <div className="flex flex-wrap gap-2">
          <StudioButton type="button" variant="danger" disabled={pending} onClick={onConfirm}>
            {pending ? "Wird gelöscht…" : confirmLabel}
          </StudioButton>
          <StudioButton type="button" variant="secondary" disabled={pending} onClick={onClose}>
            Abbrechen
          </StudioButton>
        </div>
      }
    >
      <p className="text-sm leading-6 text-slate-600">
        Willst du wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
      </p>

      {warnings ? <div className="mt-4 space-y-3">{warnings}</div> : null}

      {offlineSwitch ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <input
            type="checkbox"
            checked={offlineSwitch.checked}
            disabled={pending}
            onChange={(e) => offlineSwitch.onChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-amber-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-amber-950">{offlineSwitch.label}</span>
        </label>
      ) : null}

      {extraActions ? <div className="mt-4">{extraActions}</div> : null}

      {!warnings && !offlineSwitch ? (
        <div className="mt-4">
          <StudioHint tone="warn">Bitte bestätige, dass du die Auswahl wirklich entfernen möchtest.</StudioHint>
        </div>
      ) : null}
    </StudioModal>
  );
}
