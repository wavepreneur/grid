"use client";

import { useMemo, useState } from "react";
import { BetaNotesPanel } from "@/components/game/beta-notes-panel";
import { LevelHero } from "@/components/game/city/level-screen-blocks";
import {
  buildGpsWaypoints,
  computeTargetDistance,
  GpsMissionMap,
} from "@/components/game/gps-mission-map";
import { LevelSolvePanel } from "@/components/game/level-solve-panel";
import { LevelScoringBar } from "@/components/game/level-scoring-bar";
import { MediaModal } from "@/components/game/media-modal";
import { HintUnlockToast } from "@/components/game/hint-unlock-toast";
import type { SolveFeedbackState } from "@/components/game/solve-feedback-banner";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import type { GameLevelStatus } from "@/lib/grid/game-state";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { isWithinGeofenceForPlay } from "@/lib/grid/geofence";
import type { LevelContentTile, LevelDefinition, SolveLevelPayload } from "@/lib/grid/level-types";

type ExitmaniaLevelViewProps = {
  level: LevelDefinition;
  allLevels: LevelDefinition[];
  levelStatuses: Record<string, { status: GameLevelStatus }>;
  purchasedHints: Record<string, PurchasedTileHint>;
  score: number;
  disabled: boolean;
  isPending: boolean;
  canUnlockGps: boolean;
  effectiveBeta: boolean;
  soloAlpha?: boolean;
  gpsCapability?: boolean;
  levelStartedAt?: string | null;
  teamStartedAt?: string | null;
  myPlayerId?: string | null;
  onSubmit: (payload: SolveLevelPayload) => void;
  onPurchaseHint: (tileId: string) => void;
  feedback?: SolveFeedbackState | null;
};

export function ExitmaniaLevelView({
  level,
  allLevels,
  levelStatuses,
  purchasedHints,
  score,
  disabled,
  isPending,
  canUnlockGps,
  effectiveBeta,
  soloAlpha = false,
  gpsCapability = true,
  levelStartedAt,
  teamStartedAt,
  myPlayerId = null,
  onSubmit,
  onPurchaseHint,
  feedback = null,
}: ExitmaniaLevelViewProps) {
  const [activeTile, setActiveTile] = useState<LevelContentTile | null>(null);
  const tiles = level.tiles ?? [];
  const isGpsLevel = gpsCapability && level.type === "gps" && Boolean(level.location);
  const gpsEnabled = isGpsLevel && canUnlockGps;
  const { sample } = useGeolocation(gpsEnabled);

  const waypoints = useMemo(
    () => buildGpsWaypoints(allLevels, levelStatuses),
    [allLevels, levelStatuses],
  );

  const distanceToTarget = computeTargetDistance(sample, level.location);
  const withinRadius =
    sample && level.location ? isWithinGeofenceForPlay(sample, level.location) : false;

  const betaPanelProps = {
    tiles,
    purchasedHints,
    score,
    disabled,
    isPending,
    onOpen: setActiveTile,
    onPurchaseHint,
    soloAlpha,
  };

  return (
    <div className="city-game flex min-h-[var(--vv-height,100dvh)] min-w-0 flex-col sm:min-h-[calc(var(--vv-height,100dvh)-3.5rem)]">
      {/* Top: map / hero / scoring */}
      <div className="shrink-0 pt-[max(0.25rem,env(safe-area-inset-top))]">
        {isGpsLevel && waypoints.length > 0 ? (
          <GpsMissionMap
            waypoints={waypoints}
            activeLevel={level.level}
            target={level.location}
            playerPosition={sample}
            showPlayer={gpsEnabled}
            distanceToTarget={distanceToTarget}
            withinRadius={withinRadius}
          />
        ) : null}

        {!isGpsLevel ? (
          <LevelHero
            title={level.title}
            description={level.description}
            imageUrl={level.hero_image_url}
          />
        ) : (
          <div className="min-w-0 space-y-2 px-4 pt-3 sm:px-5">
            <h1 className="break-words text-xl font-bold text-[var(--cg-fg)] [overflow-wrap:anywhere] sm:text-2xl">
              {level.title}
            </h1>
            {level.description?.trim() ? (
              <p className="break-words text-sm leading-relaxed text-[var(--cg-muted)] [overflow-wrap:anywhere] whitespace-pre-wrap">
                {level.description}
              </p>
            ) : null}
          </div>
        )}

        {level.scoring ? (
          <div className="px-4 pt-4 sm:px-5">
            <LevelScoringBar
              scoring={level.scoring}
              startedAt={levelStartedAt}
              fallbackStartedAt={teamStartedAt}
              compact
            />
          </div>
        ) : null}
      </div>

      {/* Middle: tiles — centers vertically when content is sparse */}
      <div className="flex min-h-[10rem] flex-1 flex-col justify-center px-4 py-8 sm:px-5 sm:py-10">
        {effectiveBeta ? (
          <BetaNotesPanel {...betaPanelProps} layout="inline" cityStyle />
        ) : (
          <div className="rounded-3xl bg-[var(--cg-card)] px-4 py-4 text-sm text-[var(--cg-muted)] shadow-[var(--cg-shadow-soft)]">
            Hinweise und Dokumente sieht nur die Hinweis-Rolle. Der Team-Leiter schaltet
            Wegpunkte frei.
          </div>
        )}
      </div>

      {/* Bottom: solve / OK — anchored to the bottom of the phone column */}
      <div className="mt-auto shrink-0 px-4 pb-[max(1.5rem,calc(0.75rem+env(safe-area-inset-bottom)))] pt-2 sm:px-5">
        <LevelSolvePanel
          level={level}
          disabled={disabled}
          isPending={isPending}
          isNavigator={canUnlockGps}
          levelStartedAt={levelStartedAt}
          fallbackStartedAt={teamStartedAt}
          onSubmit={onSubmit}
          hideGpsStatus={isGpsLevel && waypoints.length > 0}
          cityStyle
          hideScoring
          feedback={feedback}
        />
      </div>

      {effectiveBeta ? (
        <MediaModal
          tile={activeTile}
          onClose={() => setActiveTile(null)}
          purchasedHints={purchasedHints}
          score={score}
          isPending={isPending}
          onPurchaseHint={onPurchaseHint}
        />
      ) : null}
      <HintUnlockToast purchasedHints={purchasedHints} myPlayerId={myPlayerId} />
    </div>
  );
}
