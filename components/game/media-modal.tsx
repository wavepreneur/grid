"use client";

import { useEffect } from "react";
import type { LevelContentTile } from "@/lib/grid/level-types";
import { tileTypeLabel } from "@/lib/grid/level-content";

type MediaModalProps = {
  tile: LevelContentTile | null;
  onClose: () => void;
};

export function MediaModal({ tile, onClose }: MediaModalProps) {
  useEffect(() => {
    if (!tile) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [tile, onClose]);

  if (!tile) return null;

  const title = tile.label ?? tileTypeLabel(tile.type);
  const useImageTag = tile.type === "image";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/20 px-3 py-1 text-sm text-white hover:bg-white/10"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {useImageTag ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tile.url}
            alt={title}
            className="mx-auto h-full max-h-[calc(100vh-4rem)] w-full object-contain p-4"
          />
        ) : (
          <iframe
            src={tile.url}
            title={title}
            className="h-full w-full border-0"
            allow={
              tile.type === "video" || tile.type === "minigame"
                ? "autoplay; fullscreen; encrypted-media"
                : tile.type === "panorama_360"
                  ? "fullscreen; gyroscope; accelerometer"
                  : "autoplay"
            }
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
