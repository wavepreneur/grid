"use client";

import type { ReactNode } from "react";
import { StudioButton } from "@/components/cms/studio-ui";

type Props = {
  count: number;
  label: string;
  pending?: boolean;
  onDelete: () => void;
  onDuplicate?: () => void;
  onClear: () => void;
  extra?: ReactNode;
};

export function StudioBulkBar({
  count,
  label,
  pending,
  onDelete,
  onDuplicate,
  onClear,
  extra,
}: Props) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[150] w-[min(640px,calc(100%-2rem))] -translate-x-1/2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
        <p className="text-sm font-medium text-slate-800">
          {count} {label}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {extra}
          {onDuplicate ? (
            <StudioButton
              type="button"
              variant="secondary"
              disabled={pending}
              className="px-3 py-2 text-xs"
              onClick={onDuplicate}
            >
              {pending ? "…" : "Duplizieren"}
            </StudioButton>
          ) : null}
          <StudioButton
            type="button"
            variant="danger"
            disabled={pending}
            className="px-3 py-2 text-xs"
            onClick={onDelete}
          >
            {pending ? "…" : "Löschen"}
          </StudioButton>
          <StudioButton
            type="button"
            variant="secondary"
            disabled={pending}
            className="px-3 py-2 text-xs"
            onClick={onClear}
          >
            Abbrechen
          </StudioButton>
        </div>
      </div>
    </div>
  );
}

export function StudioSelectCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      ref={(el) => {
        if (el) el.indeterminate = Boolean(indeterminate);
      }}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-40"
    />
  );
}
