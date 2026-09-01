"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import type { GameLevelStatus, LevelRevealState, PurchasedTileHint } from "@/lib/grid/game-state";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { isWithinGeofenceForPlay } from "@/lib/grid/geofence";
import type { LevelContentTile, LevelDefinition, SolveLevelPayload } from "@/lib/grid/level-types";
import type { GpsFixPayload } from "@/lib/hooks/use-team-sync";

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
  teamReveal?: LevelRevealState | null;
  canPaceTeam?: boolean;
  leadLabel?: string;
  onReveal?: () => void;
  mirroredGps?: GpsFixPayload | null;
  onBroadcastGpsFix?: (fix: GpsFixPayload) => void;
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
  effectiveBeta: _effectiveBeta,
  soloAlpha = false,
  gpsCapability = true,
  levelStartedAt,
  teamStartedAt,
  myPlayerId = null,
  onSubmit,
  onPurchaseHint,
  feedback = null,
  teamReveal = null,
  canPaceTeam = false,
  leadLabel = "Team Lead",
  onReveal,
  mirroredGps = null,
  onBroadcastGpsFix,
}: ExitmaniaLevelViewProps) {
  void _effectiveBeta;
  const [activeTile, setActiveTile] = useState<LevelContentTile | null>(null);
  const tiles = level.tiles ?? [];
  const isGpsLevel = gpsCapability && level.type === "gps" && Boolean(level.location);
  const gpsWatch = isGpsLevel && canPaceTeam;
  const { sample: leadSample } = useGeolocation(gpsWatch);
  const sampleRef = useRef(leadSample);
  sampleRef.current = leadSample;
  const sample = useMemo(() => {
    if (canPaceTeam) return leadSample;
    if (mirroredGps && mirroredGps.level === level.level) {
      return {
        lat: mirroredGps.lat,
        lng: mirroredGps.lng,
        accuracy: mirroredGps.accuracy ?? 20,
      };
    }
    return null;
  }, [canPaceTeam, leadSample, mirroredGps, level.level]);

  const waypoints = useMemo(
    () => buildGpsWaypoints(allLevels, levelStatuses),
    [allLevels, levelStatuses],
  );

  const distanceToTarget = canPaceTeam
    ? computeTargetDistance(sample, level.location)
    : mirroredGps?.level === level.level
      ? mirroredGps.distance_m
      : null;
  const withinRadius = canPaceTeam
    ? Boolean(sample && level.location && isWithinGeofenceForPlay(sample, level.location))
    : Boolean(mirroredGps?.level === level.level && mirroredGps.within_radius);

  useEffect(() => {
    if (!gpsWatch || !onBroadcastGpsFix) return;
    const send = () => {
      const geo = sampleRef.current;
      const loc = level.location;
      if (!geo || !loc) return;
      const dist = computeTargetDistance(geo, loc);
      if (dist === null) return;
      onBroadcastGpsFix({
        level: level.level,
        lat: geo.lat,
        lng: geo.lng,
        accuracy: geo.accuracy,
        distance_m: dist,
        within_radius: isWithinGeofenceForPlay(geo, loc),
      });
    };
    send();
    const id = window.setInterval(send, 400);
    return () => window.clearInterval(id);
  }, [gpsWatch, onBroadcastGpsFix, level.level, level.location]);

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
            showPlayer
            distanceToTarget={distanceToTarget}
            withinRadius={withinRadius}
            isTracker={canPaceTeam}
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

      {/* v1: tiles/media visible to every player — role gating comes later. */}
      <div className="flex min-h-[10rem] flex-1 flex-col justify-center px-4 py-8 sm:px-5 sm:py-10">
        <BetaNotesPanel {...betaPanelProps} layout="inline" cityStyle />
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
          teamReveal={teamReveal}
          canPaceTeam={canPaceTeam}
          leadLabel={leadLabel}
          onReveal={onReveal}
        />
      </div>

      <MediaModal
        tile={activeTile}
        onClose={() => setActiveTile(null)}
        purchasedHints={purchasedHints}
        score={score}
        isPending={isPending}
        onPurchaseHint={onPurchaseHint}
      />
      <HintUnlockToast purchasedHints={purchasedHints} myPlayerId={myPlayerId} />
    </div>
  );
}
