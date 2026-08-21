"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { ContentMediaSheet } from "@/components/game/city/content-media-sheet";
import { BigButton } from "@/components/game/city/ui";
import { TileHintModal } from "@/components/game/tile-hint-modal";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import type { LevelContentTile } from "@/lib/grid/level-types";
import { HINT_POINT_COST } from "@/lib/grid/level-types";
import { tileTypeLabel } from "@/lib/grid/level-content";

type MediaModalProps = {
  tile: LevelContentTile | null;
  onClose: () => void;
  purchasedHints?: Record<string, PurchasedTileHint>;
  score?: number;
  isPending?: boolean;
  onPurchaseHint?: (tileId: string) => void;
};

export function MediaModal({
  tile,
  onClose,
  purchasedHints = {},
  score = 0,
  isPending = false,
  onPurchaseHint,
}: MediaModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewHintOpen, setViewHintOpen] = useState(false);

  useEffect(() => {
    setConfirmOpen(false);
    setViewHintOpen(false);
  }, [tile?.id]);

  useEffect(() => {
    if (!tile || !confirmOpen) return;
    if (purchasedHints[tile.id]) {
      setConfirmOpen(false);
      setViewHintOpen(true);
    }
  }, [tile, confirmOpen, purchasedHints]);

  if (!tile) return null;

  const purchased = purchasedHints[tile.id];
  const hasHint = Boolean(tile.hint?.text?.trim());
  const hintCost = tile.hint?.point_cost ?? HINT_POINT_COST;
  const title = tile.label ?? tileTypeLabel(tile.type);

  const tipSlot = hasHint ? (
    <div className="space-y-2">
      {purchased || viewHintOpen ? (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cg-success)]">
            Tipp freigeschaltet
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--cg-fg)]">
            {purchased?.text ?? tile.hint?.text}
          </p>
          <BigButton variant="ghost" onClick={onClose}>
            Schließen
          </BigButton>
        </>
      ) : (
        <>
          <BigButton
            variant="accent"
            icon={<Lightbulb className="h-5 w-5" />}
            disabled={isPending || !onPurchaseHint}
            onClick={() => setConfirmOpen(true)}
          >
            Tipp freischalten (−{hintCost} P)
          </BigButton>
          <BigButton variant="ghost" onClick={onClose}>
            Schließen
          </BigButton>
        </>
      )}
    </div>
  ) : undefined;

  return (
    <>
      <ContentMediaSheet
        open
        title={title}
        mediaType={tile.type === "image" ? "image" : "iframe"}
        mediaUrl={tile.url}
        onClose={onClose}
        tipSlot={tipSlot}
      />

      <TileHintModal
        open={confirmOpen && !purchased}
        mode="confirm"
        label={title}
        hintCost={hintCost}
        score={score}
        isPending={isPending}
        canAfford={score >= hintCost}
        onConfirm={() => {
          if (!onPurchaseHint) return;
          onPurchaseHint(tile.id);
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
