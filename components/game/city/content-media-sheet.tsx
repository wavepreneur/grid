"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

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
 * Near-fullscreen content sheet — iframe/image take almost the whole display.
 * Only a floating X closes (Escape / backdrop also work). No title chrome, no footer CTA.
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
    <div
      className="city-game fixed inset-0 z-[120] flex items-stretch justify-center bg-[var(--cg-ink)]/80 sm:items-center sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="cg-animate-rise-in relative flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-[var(--cg-card)] shadow-[var(--cg-shadow-lift)] sm:h-[min(96dvh,900px)] sm:rounded-[1.5rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="cg-tap-lift absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--cg-ink)]/70 text-white shadow-[var(--cg-shadow-lift)] backdrop-blur-sm ring-1 ring-white/25"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <div className="relative min-h-0 flex-1 bg-black">
          {mediaUrl?.trim() ? (
            isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl}
                alt={title}
                className="h-full w-full object-contain"
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
          <div className="shrink-0 border-t border-[var(--cg-border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {tipSlot}
          </div>
        ) : null}
      </div>
    </div>
  );
}
