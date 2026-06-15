"use client";

import { useEffect, useState } from "react";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import type { LevelContentTile } from "@/lib/grid/level-types";
import { HINT_POINT_COST } from "@/lib/grid/level-types";
import { tileTypeIcon, tileTypeLabel } from "@/lib/grid/level-content";

type ContentTileGridProps = {
  tiles: LevelContentTile[];
  purchasedHints: Record<string, PurchasedTileHint>;
  score: number;
  onOpen: (tile: LevelContentTile) => void;
  onPurchaseHint: (tileId: string) => void;
  disabled?: boolean;
  isPending?: boolean;
};

export function ContentTileGrid({
  tiles,
  purchasedHints,
  score,
  onOpen,
  onPurchaseHint,
  disabled = false,
  isPending = false,
}: ContentTileGridProps) {
  const [confirmTileId, setConfirmTileId] = useState<string | null>(null);

  useEffect(() => {
    if (confirmTileId && purchasedHints[confirmTileId]) {
      setConfirmTileId(null);
    }
  }, [confirmTileId, purchasedHints]);

  if (tiles.length === 0) return null;

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
        Hinweise & Medien
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {tiles.map((tile) => {
          const label = tile.label ?? tileTypeLabel(tile.type);
          const purchased = purchasedHints[tile.id];
          const hintCost = tile.hint?.point_cost ?? HINT_POINT_COST;
          const canAfford = score >= hintCost;
          const isConfirming = confirmTileId === tile.id;

          return (
            <li
              key={tile.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[var(--grid-border)] bg-black/20"
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onOpen(tile)}
                className="group flex items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--grid-accent)]/10 disabled:opacity-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--grid-accent-soft)] text-xl text-[var(--grid-accent)]">
                  {tileTypeIcon(tile.type)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white">{label}</span>
                  <span className="block text-xs text-[var(--grid-muted)]">
                    {tileTypeLabel(tile.type)} öffnen
                  </span>
                </span>
              </button>

              {tile.hint ? (
                purchased ? (
                  <div className="border-t border-[var(--grid-border)] bg-[var(--grid-accent)]/5 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--grid-accent)]">
                      Tipp · {label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white">{purchased.text}</p>
                  </div>
                ) : isConfirming ? (
                  <div className="border-t border-amber-400/30 bg-amber-400/10 px-4 py-3">
                    <p className="text-sm leading-6 text-amber-50">
                      Tipp für „{label}" freischalten? Es werden{" "}
                      <span className="font-semibold text-white">{hintCost} Punkte</span> abgezogen.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={disabled || isPending || !canAfford}
                        onClick={() => onPurchaseHint(tile.id)}
                        className="rounded-lg bg-[var(--grid-accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {isPending ? "Wird geladen…" : `${hintCost}P abziehen & Tipp anzeigen`}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setConfirmTileId(null)}
                        className="rounded-lg border border-[var(--grid-border)] px-3 py-1.5 text-xs text-[var(--grid-muted)]"
                      >
                        Abbrechen
                      </button>
                    </div>
                    {!canAfford ? (
                      <p className="mt-2 text-xs text-red-300">
                        Nicht genug Punkte (habt {score}, benötigt {hintCost}).
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={disabled || isPending}
                    onClick={() => setConfirmTileId(tile.id)}
                    className="border-t border-[var(--grid-border)] px-4 py-2.5 text-left text-xs text-[var(--grid-muted)] transition hover:bg-black/20 hover:text-white disabled:opacity-50"
                  >
                    Tipp für diese Kachel · {hintCost}P
                  </button>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
