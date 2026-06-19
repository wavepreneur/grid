"use client";

import { useMemo, useState } from "react";
import { BetaNotesPanel } from "@/components/game/beta-notes-panel";
import {
  buildGpsWaypoints,
  computeTargetDistance,
  GpsMissionMap,
} from "@/components/game/gps-mission-map";
import { LevelSolvePanel } from "@/components/game/level-solve-panel";
import { MediaModal } from "@/components/game/media-modal";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import type { GameLevelStatus } from "@/lib/grid/game-state";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
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
  onSubmit: (payload: SolveLevelPayload) => void;
  onPurchaseHint: (tileId: string) => void;
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
  onSubmit,
  onPurchaseHint,
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
    sample && level.location && distanceToTarget !== null
      ? distanceToTarget <= level.location.radius_meters
      : false;

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
    <>
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

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-8">
        <section className="flex min-w-0 flex-col gap-5">
          {!isGpsLevel && level.hero_image_url ? (
            <div className="overflow-hidden rounded-2xl border border-[var(--grid-border)] bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={level.hero_image_url}
                alt=""
                className="aspect-[16/10] max-h-52 w-full object-cover sm:aspect-[2/1] sm:max-h-none"
              />
            </div>
          ) : !isGpsLevel ? (
            <div className="flex aspect-[16/10] max-h-52 items-center justify-center rounded-2xl border border-[var(--grid-border)] bg-gradient-to-br from-[var(--grid-accent)]/20 to-black/40 sm:aspect-[2/1] sm:max-h-none">
              <span className="text-xs uppercase tracking-[0.25em] text-[var(--grid-muted)]">
                Level {level.level}
              </span>
            </div>
          ) : null}

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--grid-accent)]">
              Aufgabe {level.level} · {level.type.toUpperCase()}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{level.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--grid-muted)] whitespace-pre-line">
              {level.description}
            </p>
          </div>

          {effectiveBeta ? (
            <div className="min-w-0 w-full lg:hidden">
              <BetaNotesPanel {...betaPanelProps} layout="inline" />
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-4 text-sm text-[var(--grid-muted)] lg:hidden">
              Rätselblatt und Dokumente sieht nur Beta. Koordiniert euch per Sprache — Alpha
              schaltet GPS-Wegpunkte frei.
            </div>
          )}

          <LevelSolvePanel
            level={level}
            disabled={disabled}
            isPending={isPending}
            isNavigator={canUnlockGps}
            onSubmit={onSubmit}
            hideGpsStatus={isGpsLevel && waypoints.length > 0}
          />
        </section>

        <aside className="hidden lg:sticky lg:top-4 lg:block lg:self-start">
          {effectiveBeta ? (
            <BetaNotesPanel {...betaPanelProps} layout="sidebar" />
          ) : (
            <div className="rounded-2xl border border-[var(--grid-border)] bg-black/20 px-4 py-5 text-sm text-[var(--grid-muted)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--grid-muted)]">Gamma</p>
              <p className="mt-2">
                Du löst Aufgaben mit dem Team. Rätselblatt und Medien liegen bei Beta — sprecht euch
                ab.
              </p>
            </div>
          )}
        </aside>
      </div>

      {effectiveBeta ? <MediaModal tile={activeTile} onClose={() => setActiveTile(null)} /> : null}
    </>
  );
}
