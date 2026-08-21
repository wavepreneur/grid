"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { BigButton, SectionLabel } from "@/components/game/city/ui";

type ContentMediaSheetProps = {
  open: boolean;
  title: string;
  mediaType?: "image" | "audio" | "video" | "iframe" | string;
  mediaUrl?: string | null;
  onClose: () => void;
  /** Optional tip strip below media. */
  tipSlot?: ReactNode;
};

/**
 * Vollflächiges Content-Sheet (~90% Viewport) — iframe/Bild sauber lesbar, X zum Schließen.
 */
export function ContentMediaSheet({
  open,
  title,
  mediaType = "iframe",
  mediaUrl,
  onClose,
  tipSlot,
}: ContentMediaSheetProps) {
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

  const isImage = mediaType === "image";

  return (
    <div className="city-game fixed inset-0 z-[120] flex items-end justify-center bg-[var(--cg-ink)]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="cg-animate-rise-in flex h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.75rem] bg-[var(--cg-card)] shadow-[var(--cg-shadow-lift)] sm:rounded-[1.75rem]"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--cg-border)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <SectionLabel>Inhalt</SectionLabel>
            <p className="truncate text-base font-bold text-[var(--cg-fg)]">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="cg-tap-lift flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--cg-secondary)] text-[var(--cg-fg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-[var(--cg-bg)]">
          {mediaUrl?.trim() ? (
            isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl}
                alt={title}
                className="h-full w-full object-contain p-3"
              />
            ) : (
              <iframe
                src={mediaUrl}
                title={title}
                className="h-full w-full border-0"
                allow="autoplay; fullscreen; encrypted-media; gyroscope; accelerometer"
                allowFullScreen
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm font-semibold text-[var(--cg-muted)]">
                Noch keine Medien-URL hinterlegt.
              </p>
              <p className="text-xs text-[var(--cg-muted)]">
                Im Editor unter „Medien URL / Link“ die Website oder Datei eintragen.
              </p>
            </div>
          )}
        </div>

        {tipSlot ? (
          <div className="shrink-0 border-t border-[var(--cg-border)] px-4 py-3">{tipSlot}</div>
        ) : (
          <div className="shrink-0 border-t border-[var(--cg-border)] px-4 py-3">
            <BigButton variant="ghost" onClick={onClose}>
              Schließen
            </BigButton>
          </div>
        )}
      </div>
    </div>
  );
}
