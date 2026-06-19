"use client";

import { ContentTileGrid } from "@/components/game/content-tile-grid";
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
}: BetaNotesPanelProps) {
  if (tiles.length === 0) {
    return (
      <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 px-4 py-4 text-sm text-[var(--grid-muted)]">
        <p className="text-xs uppercase tracking-[0.18em] text-sky-300">Beta · Schreibführer</p>
        <p className="mt-2">
          {soloAlpha
            ? "Du übernimmst Beta-Ansichten (Solo-Modus). Für dieses Level liegen keine Dokumente vor."
            : "Für dieses Level liegen keine Rätselblätter oder Dokumente vor."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-sky-300">Beta · Schreibführer</p>
        <p className="mt-1 text-sm text-[var(--grid-muted)]">
          {soloAlpha
            ? "Solo-Modus: Du siehst Rätselblatt und Dokumente zusätzlich zur Alpha-Rolle."
            : "Rätselblatt, Notizen und Medien — nur auf deinem Gerät sichtbar."}
        </p>
      </div>
      <ContentTileGrid
        tiles={tiles}
        purchasedHints={purchasedHints}
        score={score}
        disabled={disabled}
        isPending={isPending}
        onOpen={onOpen}
        onPurchaseHint={onPurchaseHint}
        layout={layout}
      />
    </div>
  );
}
