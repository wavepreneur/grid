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

type TileCardProps = {
  tile: LevelContentTile;
  label: string;
  purchased?: PurchasedTileHint;
  hintCost: number;
  disabled: boolean;
  isPending: boolean;
  onOpen: (tile: LevelContentTile) => void;
  onHintClick: (tile: LevelContentTile, event: React.MouseEvent) => void;
};

function TileCard({
  tile,
  label,
  purchased,
  hintCost,
  disabled,
  isPending,
  onOpen,
  onHintClick,
}: TileCardProps) {
  const hasHint = Boolean(tile.hint);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {purchased ? (
        <span
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200"
          aria-hidden
        >
          ✓
        </span>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onOpen(tile)}
        className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 px-3 py-4 transition hover:bg-teal-50 active:bg-teal-100 disabled:opacity-50"
      >
        <span className="text-4xl leading-none" aria-hidden>
          {tileTypeIcon(tile.type)}
        </span>
        <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-700">
          {label}
        </span>
      </button>

      {hasHint ? (
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={(event) => onHintClick(tile, event)}
          className={`border-t border-slate-100 px-2 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide transition disabled:opacity-50 ${
            purchased
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }`}
        >
          {purchased ? "Tipp ansehen" : `Tipp · ${hintCost}P`}
        </button>
      ) : null}
    </div>
  );
}

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
  const isSidebar = layout === "sidebar";

  useEffect(() => {
    if (!confirmTile) return;
    if (purchasedHints[confirmTile.id]) {
      setConfirmTile(null);
      setViewHintTile(confirmTile);
    }
  }, [confirmTile, purchasedHints]);

  if (tiles.length === 0) return null;

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

  const showSwipeHint = !isSidebar && tiles.length > 1;

  return (
    <>
      <div className={isSidebar ? "flex min-h-0 flex-col" : "min-w-0 w-full"}>
        <div className="mb-3 flex shrink-0 items-end justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Hinweise & Medien</p>
          {showSwipeHint ? (
            <p className="text-[10px] text-slate-400 sm:hidden">Wischen →</p>
          ) : null}
        </div>

        {isSidebar ? (
          <ul className="grid max-h-[min(70vh,calc(100dvh-11rem))] grid-cols-2 gap-3 overflow-y-auto overscroll-contain pr-1">
            {tiles.map((tile) => {
              const label = tile.label ?? tileTypeLabel(tile.type);
              return (
                <li key={tile.id} className="min-w-0">
                  <TileCard
                    tile={tile}
                    label={label}
                    purchased={purchasedHints[tile.id]}
                    hintCost={tile.hint?.point_cost ?? HINT_POINT_COST}
                    disabled={disabled}
                    isPending={isPending}
                    onOpen={onOpen}
                    onHintClick={handleHintClick}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="game-panel-bleed">
            <ul className="tile-slider" aria-label="Hinweise und Medien">
              {tiles.map((tile) => {
                const label = tile.label ?? tileTypeLabel(tile.type);
                return (
                  <li
                    key={tile.id}
                    className="w-[42vw] max-w-[11rem] min-w-[9.5rem] shrink-0 snap-start sm:w-44 sm:max-w-[12rem]"
                  >
                    <TileCard
                      tile={tile}
                      label={label}
                      purchased={purchasedHints[tile.id]}
                      hintCost={tile.hint?.point_cost ?? HINT_POINT_COST}
                      disabled={disabled}
                      isPending={isPending}
                      onOpen={onOpen}
                      onHintClick={handleHintClick}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
        hintText={viewHintTile ? purchasedHints[viewHintTile.id]?.text : undefined}
        hintCost={viewHintTile?.hint?.point_cost ?? HINT_POINT_COST}
        score={score}
        onClose={() => setViewHintTile(null)}
      />
    </>
  );
}
