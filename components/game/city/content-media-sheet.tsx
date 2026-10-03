"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { playUi } from "@/lib/grid/play-ui";

export type MediaSheetTab = {
  id: string;
  label: string;
  coverUrl?: string;
};

type ContentMediaSheetProps = {
  open: boolean;
  title: string;
  mediaType?: "image" | "audio" | "video" | "iframe" | string;
  mediaUrl?: string | null;
  onClose: () => void;
  /** Optional tip strip below media. */
  tipSlot?: ReactNode;
  /** Live scoring / countdown — stays visible while the tile is open. */
  headerSlot?: ReactNode;
  /** Sibling tiles — switch without closing the sheet. */
  tabs?: MediaSheetTab[];
  activeTabId?: string;
  onSelectTab?: (id: string) => void;
  /** Override empty-state copy when no mediaUrl. */
  emptyMessage?: string;
  language?: string | null;
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
  headerSlot,
  tabs = [],
  activeTabId,
  onSelectTab,
  emptyMessage,
  language,
}: ContentMediaSheetProps) {
  const t = playUi(language);
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
      className="city-game fixed inset-0 z-[2000] flex items-stretch justify-center bg-[var(--cg-ink)]/80 sm:items-center sm:p-3"
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
          aria-label={t.media.close}
          className="cg-tap-lift absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--cg-ink)]/70 text-white shadow-[var(--cg-shadow-lift)] backdrop-blur-sm ring-1 ring-white/25"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>

        {headerSlot || tabs.length > 1 ? (
          <div className="shrink-0 space-y-2 border-b border-[var(--cg-border)] bg-[var(--cg-bg)] px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(3.75rem,calc(env(safe-area-inset-right)+3.25rem))]">
            {headerSlot}
            {tabs.length > 1 && onSelectTab ? (
              <MediaSheetTabs
                tabs={tabs}
                activeId={activeTabId ?? tabs[0]?.id}
                onSelect={onSelectTab}
                language={language}
              />
            ) : null}
          </div>
        ) : null}

        <div className={`relative min-h-0 flex-1 ${isImage ? "bg-black" : "bg-[#f7f6f0]"}`}>
          {mediaUrl?.trim() ? (
            isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={mediaUrl}
                src={mediaUrl}
                alt={title}
                className="h-full w-full object-contain"
              />
            ) : (
              <iframe
                key={mediaUrl}
                src={mediaUrl}
                title={title}
                className="h-full w-full border-0"
                allow="autoplay; fullscreen; encrypted-media; gyroscope; accelerometer"
                allowFullScreen
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--cg-card)] px-6 text-center">
              <p className="text-sm font-semibold text-[var(--cg-muted)]">
                {emptyMessage ?? t.media.noUrl}
              </p>
              {!emptyMessage ? (
                <p className="text-xs text-[var(--cg-muted)]">
                  Im Editor unter „Medien URL / Link“ die Website oder Datei eintragen.
                </p>
              ) : null}
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

function MediaSheetTabs({
  tabs,
  activeId,
  onSelect,
  language,
}: {
  tabs: MediaSheetTab[];
  activeId: string;
  onSelect: (id: string) => void;
  language?: string | null;
}) {
  const t = playUi(language);
  return (
    <div
      role="tablist"
      aria-label={t.tiles.switchAria}
      className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab, index) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
            className={`cg-tap-lift flex h-11 min-w-0 shrink-0 items-center gap-2 rounded-full px-2.5 text-left ${
              active
                ? "bg-[var(--cg-primary)] text-[var(--cg-primary-fg)] shadow-[var(--cg-shadow-soft)]"
                : "bg-[var(--cg-secondary)] text-[var(--cg-fg)]"
            }`}
          >
            {tab.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tab.coverUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  active ? "bg-[var(--cg-primary-fg)]/20" : "bg-[var(--cg-card)]"
                }`}
              >
                {index + 1}
              </span>
            )}
            <span className="max-w-[7.5rem] truncate text-xs font-extrabold">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
