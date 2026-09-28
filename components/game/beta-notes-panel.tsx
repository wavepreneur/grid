"use client";

import { ContentTileGrid } from "@/components/game/content-tile-grid";
import { SectionLabel } from "@/components/game/city/ui";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import type { LevelContentTile } from "@/lib/grid/level-types";
import { playUi } from "@/lib/grid/play-ui";

type BetaNotesPanelProps = {
  tiles: LevelContentTile[];
  purchasedHints: Record<string, PurchasedTileHint>;
  score: number;
  disabled?: boolean;
  isPending?: boolean;
  onOpen: (tile: LevelContentTile) => void;
  onPurchaseHint: (tileId: string) => void;
  layout?: "inline" | "sidebar";
  soloAlpha?: boolean;
  /** City-Game Look — gleiche Kacheln wie Studio-Vorschau / frontend_idee. */
  cityStyle?: boolean;
  language?: string | null;
};

export function BetaNotesPanel({
  tiles,
  purchasedHints,
  score,
  disabled = false,
  isPending = false,
  onOpen,
  onPurchaseHint,
  layout = "inline",
  soloAlpha = false,
  cityStyle = false,
  language,
}: BetaNotesPanelProps) {
  const t = playUi(language);
  if (tiles.length === 0) {
    if (cityStyle) {
      return (
        <div className="rounded-3xl bg-[var(--cg-card)] px-4 py-4 text-sm text-[var(--cg-muted)] shadow-[var(--cg-shadow-soft)]">
          <SectionLabel>{t.notes.heading}</SectionLabel>
          <p className="mt-2">
            {soloAlpha ? t.notes.noneSolo : t.notes.none}
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-slate-600">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          {t.notes.heading}
        </p>
        <p className="mt-2">
          {soloAlpha ? t.notes.noneSolo : t.notes.none}
        </p>
      </div>
    );
  }

  return (
    <ContentTileGrid
      tiles={tiles}
      purchasedHints={purchasedHints}
      score={score}
      disabled={disabled}
      isPending={isPending}
      onOpen={onOpen}
      onPurchaseHint={onPurchaseHint}
      layout={layout}
      cityStyle={cityStyle}
      soloAlpha={soloAlpha}
      language={language}
    />
  );
}
