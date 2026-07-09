"use client";

import { useRef, useState, useTransition } from "react";
import { uploadStudioImage } from "@/app/actions/cms/media";
import { GridButton, GridError, GridInput, GridLabel } from "@/components/grid/grid-shell";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onClear?: () => void;
  hint?: string;
};

export function ImageUploadField({ label, value, onChange, onClear, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const result = await uploadStudioImage(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onChange(result.data!.url);
    });
  }

  return (
    <div className="space-y-2">
      <GridLabel>{label}</GridLabel>
      {hint ? <p className="text-xs text-[var(--grid-muted)]">{hint}</p> : null}
      {error ? <GridError message={error} /> : null}

      {value ? (
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--grid-border)] bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
              className="text-sm text-[var(--grid-accent)] hover:underline disabled:opacity-50"
            >
              Bild ersetzen
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                onChange("");
                onClear?.();
              }}
              className="text-sm text-red-300 hover:underline disabled:opacity-50"
            >
              Entfernen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--grid-border)] bg-black/20 px-4 py-8 text-sm text-[var(--grid-muted)] transition hover:border-[var(--grid-accent)]/40 hover:text-white disabled:opacity-50"
        >
          <span className="text-2xl">↑</span>
          {pending ? "Wird hochgeladen…" : "Bild hochladen"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <div>
        <GridLabel>Oder URL</GridLabel>
        <GridInput
          value={value}
          placeholder="https://…"
          disabled={pending}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
