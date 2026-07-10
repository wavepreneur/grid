"use client";

import { ContentTileGrid } from "@/components/game/content-tile-grid";
import { IconInfo } from "@/components/cms/studio-icons";
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
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-slate-600">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-700">
          <IconInfo size={14} />
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
    <div className="flex min-w-0 flex-col gap-3">
      <div>
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-700">
          <IconInfo size={14} />
          Hinweise & Dokumente
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {soloAlpha
            ? "Solo-Modus: Du siehst alle Medien auf deinem Gerät."
            : "Rätselblätter und Medien — nur auf deinem Gerät sichtbar."}
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
