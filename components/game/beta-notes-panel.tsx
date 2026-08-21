"use client";

import { ContentTileGrid } from "@/components/game/content-tile-grid";
import { SectionLabel } from "@/components/game/city/ui";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import type { LevelContentTile } from "@/lib/grid/level-types";

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
}: BetaNotesPanelProps) {
  if (tiles.length === 0) {
    if (cityStyle) {
      return (
        <div className="rounded-3xl bg-[var(--cg-card)] px-4 py-4 text-sm text-[var(--cg-muted)] shadow-[var(--cg-shadow-soft)]">
          <SectionLabel>Hinweise & Dokumente</SectionLabel>
          <p className="mt-2">
            {soloAlpha
              ? "Solo-Modus: Für diese Aufgabe liegen keine extra Dokumente vor."
              : "Für diese Aufgabe liegen keine extra Dokumente vor."}
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-slate-600">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          Hinweise & Dokumente
        </p>
        <p className="mt-2">
          {soloAlpha
            ? "Solo-Modus: Für diese Aufgabe liegen keine extra Dokumente vor."
            : "Für diese Aufgabe liegen keine extra Dokumente vor."}
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
    />
  );
}
