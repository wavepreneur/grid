"use client";

import { useRef, useState, useTransition } from "react";
import { uploadStudioImage } from "@/app/actions/cms/media";
import { IconUpload } from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioError,
  StudioInput,
  StudioLabel,
} from "@/components/cms/studio-ui";

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
      <StudioLabel hint={hint}>{label}</StudioLabel>
      {error ? <StudioError message={error} /> : null}

      {value ? (
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col gap-2">
            <StudioButton
              type="button"
              variant="ghost"
              disabled={pending}
              className="px-0 py-1 text-sm"
              onClick={() => inputRef.current?.click()}
            >
              Bild ersetzen
            </StudioButton>
            <StudioButton
              type="button"
              variant="ghost"
              disabled={pending}
              className="px-0 py-1 text-sm text-red-600 hover:bg-transparent hover:text-red-700"
              onClick={() => {
                onChange("");
                onClear?.();
              }}
            >
              Entfernen
            </StudioButton>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-700 disabled:opacity-50"
        >
          <IconUpload size={24} className="text-slate-400" />
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
        <StudioLabel hint="Alternativ direkt einfügen">Bild-URL</StudioLabel>
        <StudioInput
          value={value}
          placeholder="https://…"
          disabled={pending}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
