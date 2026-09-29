"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { ContentMediaSheet } from "@/components/game/city/content-media-sheet";
import { BigButton } from "@/components/game/city/ui";
import { LevelScoringBar } from "@/components/game/level-scoring-bar";
import { TileHintModal } from "@/components/game/tile-hint-modal";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import type { LevelContentTile, LevelScoring } from "@/lib/grid/level-types";
import { HINT_POINT_COST } from "@/lib/grid/level-types";
import type { LevelScoringSnapshot } from "@/lib/grid/level-scoring";
import { hasLiveLevelScoring } from "@/lib/grid/level-scoring";
import { playTileTypeLabel, playUi } from "@/lib/grid/play-ui";

type MediaModalProps = {
  tile: LevelContentTile | null;
  onClose: () => void;
  purchasedHints?: Record<string, PurchasedTileHint>;
  score?: number;
  isPending?: boolean;
  language?: string | null;
  onPurchaseHint?: (tileId: string) => void;
  scoring?: LevelScoring;
  startedAt?: string | null;
  fallbackStartedAt?: string | null;
  scoringSnapshot?: LevelScoringSnapshot | null;
};

export function MediaModal({
  tile,
  onClose,
  purchasedHints = {},
  isPending = false,
  language,
  onPurchaseHint,
  scoring,
  startedAt,
  fallbackStartedAt,
  scoringSnapshot,
}: MediaModalProps) {
  const t = playUi(language);
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
  const title = tile.label ?? playTileTypeLabel(tile.type, language);

  const tipSlot = hasHint ? (
    <div className="space-y-2">
      {purchased || viewHintOpen ? (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--cg-success)]">
            {t.hint.unlocked}
          </p>
          {purchased?.unlocked_by ? (
            <p className="text-sm font-semibold text-[var(--cg-muted)]">
              {t.hint.byForTeam(purchased.unlocked_by)}
            </p>
          ) : null}
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--cg-fg)]">
            {purchased?.text ?? tile.hint?.text}
          </p>
        </>
      ) : (
        <BigButton
          variant="accent"
          icon={<Lightbulb className="h-5 w-5" />}
          disabled={isPending || !onPurchaseHint}
          onClick={() => setConfirmOpen(true)}
        >
          {t.hint.unlockPts(hintCost)}
        </BigButton>
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
        language={language}
        headerSlot={
          scoring && hasLiveLevelScoring(scoring) ? (
            <LevelScoringBar
              scoring={scoring}
              startedAt={startedAt}
              fallbackStartedAt={fallbackStartedAt}
              snapshot={scoringSnapshot}
              compact
              embedded
              language={language}
            />
          ) : null
        }
      />

      <TileHintModal
        open={confirmOpen && !purchased}
        mode="confirm"
        label={title}
        hintCost={hintCost}
        isPending={isPending}
        language={language}
        onConfirm={() => {
          if (!onPurchaseHint) return;
          onPurchaseHint(tile.id);
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
