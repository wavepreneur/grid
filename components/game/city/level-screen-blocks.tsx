"use client";

import type { ReactNode } from "react";
import {
  FileText,
  Globe,
  Image as ImageIcon,
  Play,
  Volume2,
} from "lucide-react";
import { SectionLabel } from "@/components/game/city/ui";

export function LevelHero({
  title,
  description,
  imageUrl,
  tall = false,
}: {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  tall?: boolean;
}) {
  const height = tall ? "h-44 sm:h-52" : "h-40 sm:h-48";
  const hero = imageUrl?.trim() || "";
  return (
    <div>
      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero} alt="" className={`w-full object-cover ${height}`} />
      ) : null}
      {title?.trim() ? (
        <div className="min-w-0 space-y-1.5 px-4 pt-4 sm:px-5">
          <h1 className="break-words text-2xl font-bold leading-tight text-[var(--cg-fg)] [overflow-wrap:anywhere] sm:text-[1.65rem]">
            {title.trim()}
          </h1>
          {description?.trim() ? (
            <p className="break-words text-sm leading-relaxed text-[var(--cg-muted)] [overflow-wrap:anywhere] whitespace-pre-wrap">
              {description.trim()}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Lucide-Icon für Medientyp — sichtbar, wenn kein Cover-Bild gesetzt ist. */
export function mediaTypeLucideIcon(type: string, className = "h-7 w-7") {
  const props = { className, strokeWidth: 1.5, "aria-hidden": true as const };
  switch (type) {
    case "video":
      return <Play {...props} />;
    case "audio":
      return <Volume2 {...props} />;
    case "iframe":
    case "minigame":
      return <Globe {...props} />;
    case "pdf":
      return <FileText {...props} />;
    case "image":
    default:
      return <ImageIcon {...props} />;
  }
}

export type LevelTilePreviewModel = {
  id: string;
  index: number;
  label: string;
  /** Medientyp für Platzhalter-Icon ohne Cover. */
  mediaType?: string;
  icon?: ReactNode;
  coverImageUrl?: string | null;
  hintAvailable?: boolean;
  hintCost?: number;
  hintUnlocked?: boolean;
  disabled?: boolean;
  onOpen?: () => void;
  onHint?: () => void;
};

export function LevelTilesSection({
  tiles,
  title,
}: {
  tiles: LevelTilePreviewModel[];
  title?: string;
}) {
  if (tiles.length === 0) return null;
  const single = tiles.length === 1;
  const heading =
    title ?? (single ? "Rätselkachel" : `${tiles.length} Rätselkacheln`);

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div>
          <SectionLabel>{heading}</SectionLabel>
        </div>
        <span className="shrink-0 text-xs font-semibold text-[var(--cg-muted)]">
          Antippen zum Öffnen
        </span>
      </div>
      <div
        className={
          single
            ? "mt-3 flex justify-center"
            : "mt-3 flex items-start snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
      >
        {tiles.map((tile) => (
          <LevelTileCard key={tile.id} tile={tile} single={single} />
        ))}
      </div>
    </div>
  );
}

function LevelTileCard({
  tile,
  single,
}: {
  tile: LevelTilePreviewModel;
  single: boolean;
}) {
  const size = single ? "h-40 w-40 max-w-full" : "h-36 w-36 snap-center sm:h-40 sm:w-40";
  const cover = tile.coverImageUrl?.trim() || "";
  const hasCover = cover.length > 0;
  const placeholderIcon =
    tile.icon ?? mediaTypeLucideIcon(tile.mediaType ?? "image");

  return (
    <div className={`relative flex-none ${size}`}>
      <button
        type="button"
        disabled={tile.disabled || !tile.onOpen}
        onClick={tile.onOpen}
        aria-label={tile.label}
        className={`cg-tap-lift absolute inset-0 overflow-hidden rounded-[1.35rem] shadow-[var(--cg-shadow-tile)] disabled:opacity-50 ${
          hasCover ? "" : "bg-[var(--cg-secondary)]"
        }`}
      >
        {hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-[var(--cg-muted)]">
            {placeholderIcon}
            <span className="max-w-full truncate text-sm font-semibold text-[var(--cg-fg)]">
              {tile.label}
            </span>
          </span>
        )}
      </button>
    </div>
  );
}

export function LevelTaskCard({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

export function LevelScoreHud({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 px-1">
      {children}
    </div>
  );
}

export function ScorePill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "urgent" | "success";
}) {
  const tones = {
    default: "bg-[var(--cg-secondary)] text-[var(--cg-fg)]",
    accent: "bg-[var(--cg-primary)]/15 text-[var(--cg-primary)]",
    urgent: "bg-amber-100 text-amber-900",
    success: "bg-[var(--cg-success)]/15 text-[var(--cg-success)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tabular-nums ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
