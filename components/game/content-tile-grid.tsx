"use client";

import { SectionLabel } from "@/components/game/city/ui";
import { mediaTypeLucideIcon } from "@/components/game/city/level-screen-blocks";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import type { LevelContentTile } from "@/lib/grid/level-types";
import { tileTypeLabel } from "@/lib/grid/level-content";

type ContentTileGridProps = {
  tiles: LevelContentTile[];
  purchasedHints: Record<string, PurchasedTileHint>;
  score: number;
  onOpen: (tile: LevelContentTile) => void;
  onPurchaseHint: (tileId: string) => void;
  disabled?: boolean;
  isPending?: boolean;
  layout?: "inline" | "sidebar";
  cityStyle?: boolean;
  soloAlpha?: boolean;
};

/** Kachel-Raster — freigeschaltete Tipps sind für alle am Badge sichtbar. */
export function ContentTileGrid({
  tiles,
  purchasedHints,
  onOpen,
  disabled = false,
  layout = "inline",
  cityStyle = false,
  soloAlpha = false,
}: ContentTileGridProps) {
  const isSidebar = layout === "sidebar";
  const single = tiles.length === 1;

  if (tiles.length === 0) return null;

  const heading = single ? "Rätselkachel" : `${tiles.length} Rätselkacheln`;

  return (
    <div className={isSidebar ? "flex min-h-0 flex-col" : "min-w-0 w-full"}>
      {cityStyle ? (
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div>
            <SectionLabel>{heading}</SectionLabel>
          </div>
          <span className="shrink-0 text-xs font-semibold text-[var(--cg-muted)]">
            Antippen zum Öffnen
          </span>
        </div>
      ) : (
        <div className="mb-3 flex shrink-0 items-end justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Hinweise & Medien</p>
        </div>
      )}

      <div
        className={
          cityStyle
            ? single
              ? "flex justify-center"
              : "flex items-start snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : single
              ? "flex justify-center"
              : isSidebar
                ? "min-h-0 flex-1 overflow-y-auto"
                : "game-panel-bleed"
        }
      >
        {cityStyle ? (
          tiles.map((tile) => {
            const label = tile.label ?? tileTypeLabel(tile.type);
            const size = single
              ? "h-32 w-32 max-w-full"
              : "h-32 w-32 snap-center sm:h-36 sm:w-36";
            const cover = tile.cover_image_url?.trim() || "";
            const hasCover = cover.length > 0;
            const tip = purchasedHints[tile.id];

            return (
              <div key={tile.id} className={`relative flex-none ${size}`}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onOpen(tile)}
                  aria-label={label}
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
                      {mediaTypeLucideIcon(tile.type)}
                      <span className="max-w-full truncate text-sm font-semibold text-[var(--cg-fg)]">
                        {label}
                      </span>
                    </span>
                  )}
                </button>
                {tip ? (
                  <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-[var(--cg-success)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                    Tipp{tip.unlocked_by ? ` · ${tip.unlocked_by}` : ""}
                  </span>
                ) : null}
              </div>
            );
          })
        ) : (
          <ul
            className={single ? "grid w-full max-w-[11rem]" : "tile-slider"}
            aria-label="Hinweise und Medien"
          >
            {tiles.map((tile) => {
              const label = tile.label ?? tileTypeLabel(tile.type);
              const tip = purchasedHints[tile.id];
              return (
                <li
                  key={tile.id}
                  className="w-[42vw] max-w-[11rem] min-w-[9.5rem] shrink-0 snap-start sm:w-44 sm:max-w-[12rem]"
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onOpen(tile)}
                    className="relative flex aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm disabled:opacity-50"
                  >
                    {tile.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tile.cover_image_url}
                        alt={label}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
                        {label}
                      </span>
                    )}
                    {tip ? (
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        Tipp
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {cityStyle && soloAlpha ? (
        <p className="mt-2 text-center text-xs text-[var(--cg-muted)]">
          Solo-Modus: Du siehst alle Medien auf deinem Gerät.
        </p>
      ) : null}
    </div>
  );
}
