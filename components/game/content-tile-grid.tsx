"use client";

import { useEffect, useState } from "react";
import { TileHintModal } from "@/components/game/tile-hint-modal";
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
  layout?: "inline" | "sidebar";
};

export function ContentTileGrid({
  tiles,
  purchasedHints,
  score,
  onOpen,
  onPurchaseHint,
  disabled = false,
  isPending = false,
  layout = "inline",
}: ContentTileGridProps) {
  const [confirmTile, setConfirmTile] = useState<LevelContentTile | null>(null);
  const [viewHintTile, setViewHintTile] = useState<LevelContentTile | null>(null);

  useEffect(() => {
    if (!confirmTile) return;
    if (purchasedHints[confirmTile.id]) {
      setConfirmTile(null);
      setViewHintTile(confirmTile);
    }
  }, [confirmTile, purchasedHints]);

  if (tiles.length === 0) return null;

  const isSidebar = layout === "sidebar";

  function handleHintClick(tile: LevelContentTile, event: React.MouseEvent) {
    event.stopPropagation();
    if (purchasedHints[tile.id]) {
      setViewHintTile(tile);
      return;
    }
    setConfirmTile(tile);
  }

  function handleConfirmPurchase() {
    if (!confirmTile) return;
    onPurchaseHint(confirmTile.id);
  }

  return (
    <>
      <div className={isSidebar ? "flex min-h-0 flex-col" : ""}>
        <p className="mb-3 shrink-0 text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
          Hinweise & Medien
        </p>

        <ul
          className={
            isSidebar
              ? "grid max-h-[min(70vh,calc(100dvh-11rem))] grid-cols-2 gap-3 overflow-y-auto overscroll-contain pr-1"
              : "flex gap-3 overflow-x-auto overscroll-x-contain pb-2 snap-x snap-mandatory"
          }
        >
          {tiles.map((tile) => {
            const label = tile.label ?? tileTypeLabel(tile.type);
            const purchased = purchasedHints[tile.id];
            const hintCost = tile.hint?.point_cost ?? HINT_POINT_COST;
            const hasHint = Boolean(tile.hint);

            return (
              <li
                key={tile.id}
                className={
                  isSidebar
                    ? "min-w-0"
                    : "w-44 shrink-0 snap-start sm:w-48"
                }
              >
                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--grid-border)] bg-[var(--grid-accent-soft)]/40">
                  {purchased ? (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                      ✓
                    </span>
                  ) : null}

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onOpen(tile)}
                    className="flex flex-1 flex-col items-center justify-center gap-3 px-3 pb-3 pt-5 transition hover:bg-[var(--grid-accent)]/10 disabled:opacity-50 aspect-square"
                  >
                    <span className="text-3xl leading-none text-[var(--grid-accent)] sm:text-4xl">
                      {tileTypeIcon(tile.type)}
                    </span>
                    <span className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                      {label}
                    </span>
                  </button>

                  {hasHint ? (
                    <button
                      type="button"
                      disabled={disabled || isPending}
                      onClick={(event) => handleHintClick(tile, event)}
                      className={`border-t border-[var(--grid-border)] px-2 py-2 text-center text-[10px] font-medium uppercase tracking-[0.1em] transition disabled:opacity-50 ${
                        purchased
                          ? "bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                          : "bg-black/20 text-[var(--grid-muted)] hover:bg-black/30 hover:text-white"
                      }`}
                    >
                      {purchased ? "Tipp ansehen" : `Tipp · ${hintCost}P`}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <TileHintModal
        open={Boolean(confirmTile) && !purchasedHints[confirmTile?.id ?? ""]}
        mode="confirm"
        label={confirmTile ? (confirmTile.label ?? tileTypeLabel(confirmTile.type)) : ""}
        hintCost={confirmTile?.hint?.point_cost ?? HINT_POINT_COST}
        score={score}
        isPending={isPending}
        canAfford={score >= (confirmTile?.hint?.point_cost ?? HINT_POINT_COST)}
        onConfirm={handleConfirmPurchase}
        onClose={() => setConfirmTile(null)}
      />

      <TileHintModal
        open={Boolean(viewHintTile)}
        mode="view"
        label={viewHintTile ? (viewHintTile.label ?? tileTypeLabel(viewHintTile.type)) : ""}
        hintText={
          viewHintTile ? purchasedHints[viewHintTile.id]?.text : undefined
        }
        hintCost={viewHintTile?.hint?.point_cost ?? HINT_POINT_COST}
        score={score}
        onClose={() => setViewHintTile(null)}
      />
    </>
  );
}
