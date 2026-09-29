"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildGpsWaypoints,
  computeTargetDistance,
  GpsMissionMap,
} from "@/components/game/gps-mission-map";
import { OutdoorWalkRing } from "@/components/game/outdoor-walk-ring";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { IconCheck, IconLock, IconX } from "@/components/game/city/icons";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { useWalkedDistance } from "@/lib/hooks/use-walked-distance";
import type { ContentMode } from "@/lib/cms/layer-model";
import { isWithinGeofenceForPlay, playGeofenceRadiusMeters, withHealthRadiusBonus } from "@/lib/grid/geofence";
import {
  computeHealthRadiusBonus,
  isNearButOutsideGeofence,
} from "@/lib/grid/cockpit-health";
import {
  effectiveDistanceUnlockMeters,
  type OutdoorForceUnlock,
} from "@/lib/grid/outdoor-unlock";
import { playPlaySfx } from "@/lib/grid/play-sfx";
import { FormattedTaskText } from "@/components/game/formatted-task-text";
import type { GameLevelStatus } from "@/lib/grid/game-state";
import type { LevelDefinition, GeolocationSample } from "@/lib/grid/level-types";
import type { GpsFixPayload } from "@/lib/hooks/use-team-sync";
import { hubLabel } from "@/lib/grid/play-slots";
import { playUi } from "@/lib/grid/play-ui";
import { useGeoAccess } from "@/lib/hooks/use-geo-access";

export type OutdoorArriveInput = {
  geolocation?: GeolocationSample;
  targetLevel?: number;
  walkedMeters?: number;
  forceUnlock?: OutdoorForceUnlock;
  healthRadiusBonusMeters?: number;
};

type Props = {
  mode: ContentMode;
  levels: LevelDefinition[];
  levelStatuses: Record<string, { status: GameLevelStatus }>;
  activeLevel: number;
  routeOrder?: "linear" | "free";
  canUnlockGps: boolean;
  disabled: boolean;
  isPending: boolean;
  /** Persist outdoor walk progress across remounts. */
  walkStorageKey?: string | null;
  /** Server-held meters for the active distance unlock (fallback if broadcast missed). */
  serverWalkedMeters?: number;
  /** Team lead's phone is the only GPS counter; others mirror this. */
  isWalkTracker?: boolean;
  mirroredWalkedMeters?: number;
  onArriveOutdoor: (input: OutdoorArriveInput) => void;
  onSolveGpsCheckpoint: (input: OutdoorArriveInput) => void;
  onOpenStation: (levelNumber: number, stationCode?: string) => Promise<boolean>;
  onSubmitStationCode: (code: string) => void;
  onStartMission: (levelNumber: number) => void;
  /** Lead persists walk to the server (infrequent). */
  onReportWalkProgress?: (level: number, walkedMeters: number) => void;
  /** Lead fans out live meters to teammates (no server round-trip). */
  onBroadcastWalkProgress?: (level: number, walkedMeters: number) => void;
  mirroredGps?: GpsFixPayload | null;
  onBroadcastGpsFix?: (fix: GpsFixPayload) => void;
  /** Studio playtest — GPS waypoints can be opened without being on site. */
  isStudioTest?: boolean;
  language?: string | null;
  /** Open the menu GPS help page (iOS/Android steps). */
  onOpenGpsHelp?: () => void;
};

export function PlayHubView({
  mode,
  levels,
  levelStatuses,
  activeLevel,
  routeOrder = "linear",
  canUnlockGps,
  disabled,
  isPending,
  walkStorageKey = null,
  serverWalkedMeters = 0,
  isWalkTracker = false,
  mirroredWalkedMeters = 0,
  onArriveOutdoor,
  onSolveGpsCheckpoint,
  onOpenStation,
  onSubmitStationCode,
  onStartMission,
  onReportWalkProgress,
  onBroadcastWalkProgress,
  mirroredGps = null,
  onBroadcastGpsFix,
  isStudioTest = false,
  language,
  onOpenGpsHelp,
}: Props) {
  const t = playUi(language);
  const metaLabel = hubLabel(mode, language);
  const current = levels.find((l) => l.level === activeLevel) ?? levels[0];
  const [code, setCode] = useState("");
  const [codeFor, setCodeFor] = useState<number | null>(null);
  const [codeWrong, setCodeWrong] = useState(false);
  const wrongResetRef = useRef<number | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (wrongResetRef.current != null) window.clearTimeout(wrongResetRef.current);
    };
  }, []);

  // Outdoor GPS pin OR walk/time trigger → dedicated outdoor hub.
  const outdoorTriggered =
    mode === "outdoor" &&
    Boolean(
      current?.location ||
        current?.triggers?.type === "distance" ||
        current?.triggers?.type === "time",
    );

  if (outdoorTriggered && current) {
    const gpsOnly =
      current.type === "gps" &&
      !current.arrival_quiz &&
      !current.answer &&
      !(current.tiles && current.tiles.length > 0) &&
      !(current.options && current.options.length > 0);

    return (
      <OutdoorHub
        levels={levels}
        levelStatuses={levelStatuses}
        current={current}
        routeOrder={routeOrder}
        canUnlockGps={canUnlockGps}
        isWalkTracker={isWalkTracker}
        disabled={disabled}
        isPending={isPending}
        walkStorageKey={walkStorageKey}
        serverWalkedMeters={serverWalkedMeters}
        mirroredWalkedMeters={mirroredWalkedMeters}
        mirroredGps={mirroredGps}
        onReportWalkProgress={onReportWalkProgress}
        onBroadcastWalkProgress={onBroadcastWalkProgress}
        onBroadcastGpsFix={onBroadcastGpsFix}
        onArrive={
          gpsOnly
            ? (input) => onSolveGpsCheckpoint(input)
            : (input) => onArriveOutdoor(input)
        }
        isStudioTest={isStudioTest}
        language={language}
        onOpenGpsHelp={onOpenGpsHelp}
      />
    );
  }

  if (mode === "indoor") {
    const done = levels.filter((l) => levelStatuses[String(l.level)]?.status === "completed");
    const next = levels.find((l) => levelStatuses[String(l.level)]?.status === "active") ?? current;
    const free = routeOrder === "free";
    const allDone = done.length === levels.length && levels.length > 0;

    return (
      <section className="flex flex-col gap-4 px-4 pb-[max(1.5rem,calc(0.75rem+env(safe-area-inset-bottom)))] pt-2">
        <header>
          <SectionLabel>{metaLabel}</SectionLabel>
          <h1 className="mt-1 text-xl font-bold text-[var(--cg-fg)]">
            {t.hub.indoorDone(done.length, levels.length)}
          </h1>
          <p className="mt-2 text-sm text-[var(--cg-muted)]">
            {free ? t.hub.indoorFree : t.hub.indoorNext}
          </p>
        </header>

        <div className="flex gap-1.5">
          {levels.map((s) => {
            const status = levelStatuses[String(s.level)]?.status ?? "locked";
            return (
              <span
                key={s.level}
                className={`h-2.5 flex-1 rounded-full ${
                  status === "completed"
                    ? "bg-[var(--cg-success)]"
                    : "bg-[var(--cg-secondary)]"
                }`}
              />
            );
          })}
        </div>

        <ul className="space-y-3">
          {levels.map((s) => {
            const status = levelStatuses[String(s.level)]?.status ?? "locked";
            const isDone = status === "completed";
            const locked = !free && status === "locked";
            const isNext = !isDone && !locked && (free || status === "active");
            const asking = codeFor === s.level;
            const flashWrong = asking && codeWrong;
            return (
              <li key={s.level} className="relative">
                <div
                  className={`overflow-hidden rounded-3xl border-2 ${
                    isDone
                      ? "border-[var(--cg-success)]/50 bg-[var(--cg-success)]/10"
                      : flashWrong
                        ? "cg-animate-shake border-[var(--cg-destructive)] bg-[var(--cg-destructive)]/12"
                        : asking
                          ? "border-[var(--cg-primary)] bg-[var(--cg-card)] shadow-[var(--cg-shadow-lift)]"
                          : isNext
                            ? "border-[var(--cg-primary)]/70 bg-[var(--cg-card)]"
                            : "border-[var(--cg-border)] bg-[var(--cg-secondary)]"
                  }`}
                >
                  <button
                    type="button"
                    disabled={disabled || isPending || locked || isDone || codeWrong}
                    onClick={() => {
                      if (wrongResetRef.current != null) {
                        window.clearTimeout(wrongResetRef.current);
                        wrongResetRef.current = null;
                      }
                      setCodeWrong(false);
                      setCodeFor(s.level);
                      setCode("");
                    }}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 text-left disabled:cursor-default"
                  >
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold ${
                        isDone
                          ? "bg-[var(--cg-success)] text-white"
                          : flashWrong
                            ? "bg-[var(--cg-destructive)] text-white"
                            : locked
                              ? "bg-[var(--cg-card)] text-[var(--cg-muted)]"
                              : "bg-[var(--cg-primary)] text-[var(--cg-primary-fg)]"
                      }`}
                    >
                      {isDone ? (
                        <IconCheck size={28} />
                      ) : flashWrong ? (
                        <IconX size={28} />
                      ) : locked ? (
                        <IconLock size={24} />
                      ) : (
                        s.level
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-bold text-[var(--cg-fg)]">
                        {s.station?.name ?? s.title}
                      </span>
                      <span
                        className={`block truncate text-sm ${
                          flashWrong
                            ? "font-semibold text-[var(--cg-destructive)]"
                            : "text-[var(--cg-muted)]"
                        }`}
                      >
                        {isDone
                          ? t.hub.solved
                          : flashWrong
                            ? t.hub.wrong
                            : locked
                              ? t.hub.lockedPrev
                              : s.station?.place?.trim() || t.hub.findNote}
                      </span>
                    </span>
                  </button>

                  {locked ? (
                    <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[var(--cg-ink)]/35 backdrop-blur-[1px]" />
                  ) : null}

                  {asking && !isDone && !locked ? (
                    <div
                      className={`space-y-2 border-t px-4 pb-4 pt-3 ${
                        flashWrong
                          ? "border-[var(--cg-destructive)]/30"
                          : "border-[var(--cg-border)]"
                      }`}
                    >
                      {flashWrong ? (
                        <p className="py-2 text-center text-lg font-extrabold uppercase tracking-wide text-[var(--cg-destructive)]">
                          {t.hub.wrong}
                        </p>
                      ) : (
                        <>
                          <p className="text-sm text-[var(--cg-muted)]">
                            {t.hub.codeHint}
                          </p>
                          <input
                            ref={codeInputRef}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="CODE"
                            autoComplete="off"
                            autoCapitalize="characters"
                            className="w-full rounded-2xl border-2 border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3 text-center text-xl font-bold uppercase tracking-[0.28em] outline-none focus:border-[var(--cg-primary)]"
                          />
                          <BigButton
                            variant="accent"
                            disabled={disabled || isPending || code.trim().length < 4}
                            onClick={async () => {
                              const ok = await onOpenStation(s.level, code);
                              if (ok) return;
                              playPlaySfx("wrong");
                              setCodeWrong(true);
                              if (wrongResetRef.current != null) {
                                window.clearTimeout(wrongResetRef.current);
                              }
                              wrongResetRef.current = window.setTimeout(() => {
                                setCodeWrong(false);
                                setCode("");
                                wrongResetRef.current = null;
                                requestAnimationFrame(() => {
                                  codeInputRef.current?.focus({ preventScroll: true });
                                });
                              }, 850);
                            }}
                          >
                            {t.hub.checkCode}
                          </BigButton>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {allDone ? (
          <p className="rounded-2xl bg-[var(--cg-success)]/20 px-4 py-4 text-center text-base font-bold">
            {t.hub.allStationsDone}
          </p>
        ) : next && !free ? (
          <p className="text-center text-sm text-[var(--cg-muted)]">
            {t.hub.nextUp(next.station?.name ?? next.title)}
          </p>
        ) : null}
      </section>
    );
  }

  // online
  const next =
    levels.find((l) => levelStatuses[String(l.level)]?.status === "active") ?? levels[0];
  const doneCount = levels.filter(
    (l) => levelStatuses[String(l.level)]?.status === "completed",
  ).length;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-[max(2.5rem,calc(1.25rem+env(safe-area-inset-bottom)))] pt-2">
      <header>
        <SectionLabel>{metaLabel}</SectionLabel>
        <h1 className="mt-1 text-xl font-bold text-[var(--cg-fg)] sm:text-2xl">
          {t.hub.missionOf(next?.level ?? 0, levels.length)}
        </h1>
        <p className="mt-2 text-sm text-[var(--cg-muted)]">
          {t.hub.onlineHint(doneCount)}
        </p>
      </header>

      {next ? (
        <div className="rounded-3xl border-2 border-[var(--cg-primary)] bg-[var(--cg-card)] p-5 shadow-[var(--cg-shadow-lift)] sm:p-7">
          <SectionLabel>
            {t.hub.missionOf(next.level, levels.length)}
          </SectionLabel>
          <h2 className="mt-1 text-2xl font-bold text-[var(--cg-fg)] sm:text-3xl">{next.title}</h2>
          {next.teaser ?? next.description ? (
            <FormattedTaskText
              text={next.teaser ?? next.description}
              className="mt-2 text-base text-[var(--cg-muted)] sm:text-lg"
            />
          ) : null}
          {next.role_split ? (
            <p className="mt-4 rounded-2xl bg-[var(--cg-secondary)] px-4 py-3 text-base font-semibold text-[var(--cg-fg)]">
              {next.role_split}
            </p>
          ) : null}
          <div className="mt-5">
            <BigButton
              variant="accent"
              disabled={disabled || isPending}
              onClick={() => onStartMission(next.level)}
            >
              {t.hub.startMission}
            </BigButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OutdoorHub({
  levels,
  levelStatuses,
  current,
  routeOrder,
  canUnlockGps,
  isWalkTracker = false,
  disabled,
  isPending,
  walkStorageKey,
  serverWalkedMeters = 0,
  mirroredWalkedMeters = 0,
  mirroredGps = null,
  onArrive,
  onReportWalkProgress,
  onBroadcastWalkProgress,
  onBroadcastGpsFix,
  isStudioTest = false,
  language,
  onOpenGpsHelp,
}: {
  levels: LevelDefinition[];
  levelStatuses: Record<string, { status: GameLevelStatus }>;
  current: LevelDefinition;
  routeOrder: "linear" | "free";
  canUnlockGps: boolean;
  isWalkTracker?: boolean;
  disabled: boolean;
  isPending: boolean;
  walkStorageKey?: string | null;
  serverWalkedMeters?: number;
  mirroredWalkedMeters?: number;
  mirroredGps?: GpsFixPayload | null;
  onArrive: (input: OutdoorArriveInput) => void;
  onReportWalkProgress?: (level: number, walkedMeters: number) => void;
  onBroadcastWalkProgress?: (level: number, walkedMeters: number) => void;
  onBroadcastGpsFix?: (fix: GpsFixPayload) => void;
  isStudioTest?: boolean;
  language?: string | null;
  onOpenGpsHelp?: () => void;
}) {
  const isWalkMode =
    current.triggers?.type === "distance" &&
    Boolean(current.triggers.after_meters && current.triggers.after_meters > 0);
  const isTimeMode =
    current.triggers?.type === "time" &&
    Boolean(current.triggers.after_minutes && current.triggers.after_minutes > 0);
  const isGpsMode = Boolean(current.location) && !isWalkMode;

  const gpsEnabled = (isGpsMode || isWalkMode) && isWalkTracker;
  const { sample: leadSample } = useGeolocation(gpsEnabled && isGpsMode);
  const t = playUi(language);
  const sampleRef = useRef(leadSample);
  sampleRef.current = leadSample;
  const sample = useMemo((): GeolocationSample | null => {
    if (isWalkTracker) return leadSample;
    if (mirroredGps && mirroredGps.level === current.level) {
      return {
        lat: mirroredGps.lat,
        lng: mirroredGps.lng,
        accuracy: mirroredGps.accuracy ?? 20,
      };
    }
    return null;
  }, [isWalkTracker, leadSample, mirroredGps, current.level]);
  const levelWalkKey =
    walkStorageKey && isWalkMode
      ? `${walkStorageKey}:L${current.level}`
      : isWalkMode
        ? `grid:walk:L${current.level}`
        : null;
  const walk = useWalkedDistance(Boolean(gpsEnabled && isWalkMode), {
    storageKey: levelWalkKey,
  });
  const watchGps = Boolean(isWalkTracker && (isGpsMode || isWalkMode));
  useGeoAccess(watchGps);
  const [simBonus, setSimBonus] = useState(0);
  const [healthBonus, setHealthBonus] = useState(0);
  const arrivedPingRef = useRef(false);
  const lastReportRef = useRef(0);
  const lastGpsFixKeyRef = useRef("");
  const localWalkedRef = useRef(0);
  const healthNearSinceRef = useRef<number | null>(null);
  const healthBonusRef = useRef(0);
  healthBonusRef.current = healthBonus;

  const waypoints = useMemo(
    () => buildGpsWaypoints(levels, levelStatuses),
    [levels, levelStatuses],
  );

  const targetLevel = useMemo(() => {
    if (!isGpsMode || routeOrder !== "free" || !sample) return current;
    const hit = levels.find((level) => {
      if (!level.location) return false;
      const status = levelStatuses[String(level.level)]?.status ?? "locked";
      if (status === "locked" || status === "completed") return false;
      return isWithinGeofenceForPlay(sample, level.location);
    });
    return hit ?? current;
  }, [isGpsMode, routeOrder, sample, levels, levelStatuses, current]);

  useEffect(() => {
    healthNearSinceRef.current = null;
    setHealthBonus(0);
  }, [targetLevel.level]);

  useEffect(() => {
    if (!isGpsMode || !isWalkTracker) return;
    const tick = () => {
      const geo = sampleRef.current;
      const loc = targetLevel.location;
      if (!geo || !loc) {
        healthNearSinceRef.current = null;
        setHealthBonus(0);
        return;
      }
      const dist = computeTargetDistance(geo, loc);
      const authoredWithin = isWithinGeofenceForPlay(geo, loc);
      const playR = playGeofenceRadiusMeters(loc, geo.accuracy);
      const near = isNearButOutsideGeofence({
        distanceMeters: dist,
        playRadiusMeters: playR,
        authoredWithinRadius: authoredWithin,
      });
      if (authoredWithin || !near) {
        healthNearSinceRef.current = null;
        setHealthBonus(0);
        return;
      }
      if (healthNearSinceRef.current === null) {
        healthNearSinceRef.current = Date.now();
      }
      setHealthBonus(
        computeHealthRadiusBonus({
          authoredWithinRadius: false,
          nearStuckMs: Date.now() - healthNearSinceRef.current,
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isGpsMode, isWalkTracker, targetLevel.location, targetLevel.level]);

  const teammateHealthBonus =
    mirroredGps?.level === targetLevel.level ? (mirroredGps.health_radius_bonus_m ?? 0) : 0;
  const effectiveHealthBonus = isWalkTracker ? healthBonus : teammateHealthBonus;
  const healthLocation = targetLevel.location
    ? withHealthRadiusBonus(targetLevel.location, effectiveHealthBonus)
    : null;

  const distanceToTarget = isWalkTracker
    ? computeTargetDistance(sample, targetLevel.location)
    : mirroredGps?.level === targetLevel.level
      ? mirroredGps.distance_m
      : null;
  const withinRadius = isWalkTracker
    ? Boolean(sample && healthLocation && isWithinGeofenceForPlay(sample, healthLocation))
    : Boolean(mirroredGps?.level === targetLevel.level && mirroredGps.within_radius);
  const playRadius = healthLocation
    ? Math.round(playGeofenceRadiusMeters(healthLocation, sample?.accuracy))
    : 40;

  useEffect(() => {
    if (!isGpsMode) return;
    if (withinRadius) {
      if (!arrivedPingRef.current) {
        arrivedPingRef.current = true;
        playPlaySfx("arrive");
      }
      return;
    }
    arrivedPingRef.current = false;
  }, [isGpsMode, withinRadius]);

  const openCount = levels.filter(
    (l) => (levelStatuses[String(l.level)]?.status ?? "locked") !== "completed",
  ).length;

  const targetMeters = effectiveDistanceUnlockMeters(current.triggers?.after_meters) || 100;
  const localWalked = walk.displayMeters + simBonus;
  localWalkedRef.current = localWalked;
  const walkedMeters = isWalkTracker
    ? localWalked
    : Math.max(mirroredWalkedMeters, serverWalkedMeters);

  // Live fan-out to teammates — no server write.
  useEffect(() => {
    if (!isWalkMode || !isWalkTracker || !onBroadcastWalkProgress) return;
    const send = () =>
      onBroadcastWalkProgress(current.level, Math.max(localWalkedRef.current, 0));
    send();
    const id = window.setInterval(send, 300);
    return () => window.clearInterval(id);
  }, [isWalkMode, isWalkTracker, onBroadcastWalkProgress, current.level]);

  useEffect(() => {
    if (!isGpsMode || !isWalkTracker || !onBroadcastGpsFix) return;
    const send = () => {
      const geo = sampleRef.current;
      const loc = targetLevel.location;
      if (!geo || !loc) return;
      const dist = computeTargetDistance(geo, loc);
      if (dist === null) return;
      const bonus = healthBonusRef.current;
      const healthLoc = withHealthRadiusBonus(loc, bonus);
      const within = isWithinGeofenceForPlay(geo, healthLoc);
      const key = `${targetLevel.level}:${geo.lat.toFixed(5)}:${geo.lng.toFixed(5)}:${Math.round(dist)}:${within}:${bonus}`;
      if (key === lastGpsFixKeyRef.current) return;
      lastGpsFixKeyRef.current = key;
      onBroadcastGpsFix({
        level: targetLevel.level,
        lat: geo.lat,
        lng: geo.lng,
        accuracy: geo.accuracy,
        distance_m: dist,
        within_radius: within,
        health_radius_bonus_m: bonus > 0 ? bonus : undefined,
      });
    };
    send();
    const id = window.setInterval(send, 400);
    return () => window.clearInterval(id);
  }, [
    isGpsMode,
    isWalkTracker,
    onBroadcastGpsFix,
    targetLevel.level,
    targetLevel.location,
  ]);

  // Keep a server snapshot so reopen / crash still has a baseline.
  useEffect(() => {
    if (!isWalkMode || !isWalkTracker || !onReportWalkProgress) return;
    const meters = walk.meters + simBonus;
    if (meters < 1) return;
    const now = Date.now();
    if (now - lastReportRef.current < 8000) return;
    lastReportRef.current = now;
    onReportWalkProgress(current.level, meters);
  }, [
    isWalkMode,
    isWalkTracker,
    onReportWalkProgress,
    walk.meters,
    simBonus,
    current.level,
  ]);

  function openWithSample(
    geo?: GeolocationSample | null,
    level?: number,
    forceUnlock?: OutdoorForceUnlock,
  ) {
    const position =
      geo ??
      walk.sample ??
      sample ??
      ({ lat: 0, lng: 0, accuracy: 50 } satisfies GeolocationSample);
    onArrive({
      geolocation: position,
      targetLevel: level,
      walkedMeters: isWalkMode
        ? isWalkTracker
          ? walk.meters + simBonus
          : Math.max(mirroredWalkedMeters, serverWalkedMeters)
        : undefined,
      forceUnlock,
      healthRadiusBonusMeters: healthBonus > 0 ? healthBonus : undefined,
    });
  }

  if (isWalkMode) {
    return (
      <section className="flex min-h-[70vh] flex-col">
        <div className="space-y-1 px-4 pb-2 pt-2">
          <SectionLabel>{t.hub.huntWalk}</SectionLabel>
          <h1 className="text-xl font-bold text-[var(--cg-fg)]">
            {t.hub.taskOf(current.level, levels.length)}
          </h1>
        </div>
        <OutdoorWalkRing
          title={current.title}
          targetMeters={targetMeters}
          walkedMeters={walkedMeters}
          disabled={disabled}
          isPending={isPending}
          showForceOpen={isWalkTracker}
          onOpen={() => openWithSample(walk.sample, current.level)}
          onForceOpen={() => openWithSample(walk.sample, current.level, "distance")}
          onSimulateWalk={
            isStudioTest || process.env.NODE_ENV === "development"
              ? () => setSimBonus((m) => m + 25)
              : undefined
          }
          language={language}
        />
        {onOpenGpsHelp ? (
          <div className="px-5 pb-2">
            <GpsTroubleBlock
              canUnlock={false}
              disabled={disabled || isPending}
              onOpenGpsHelp={onOpenGpsHelp}
              language={language}
            />
          </div>
        ) : null}
        <p className="px-5 pb-6 text-center text-sm text-[var(--cg-muted)]">
          {isWalkTracker ? t.hub.walkLeadCounts : t.hub.walkFollowCounts}
        </p>
      </section>
    );
  }

  if (isTimeMode) {
    return (
      <OutdoorTimeWait
        title={current.title}
        levelIndex={current.level}
        total={levels.length}
        minutes={current.triggers?.after_minutes ?? 1}
        disabled={disabled}
        isPending={isPending}
        onOpen={() => openWithSample(sample, current.level)}
        language={language}
      />
    );
  }

  return (
    <section className="flex flex-col">
      <div className="space-y-3 px-4 pb-3 pt-2">
        <header>
          <SectionLabel>{t.hub.hunt}</SectionLabel>
          <h1 className="text-xl font-bold text-[var(--cg-fg)]">
            {routeOrder === "free"
              ? t.hub.openOf(openCount, levels.length)
              : t.hub.taskOf(current.level, levels.length)}
          </h1>
          <p className="mt-1 text-sm text-[var(--cg-muted)]">
            {routeOrder === "free" ? t.hub.followFree : t.hub.followLinear}
          </p>
        </header>
      </div>

      <div className="px-4">
        {waypoints.length > 0 ? (
          <GpsMissionMap
            waypoints={waypoints}
            activeLevel={targetLevel.level}
            target={targetLevel.location}
            playerPosition={sample}
            showPlayer
            distanceToTarget={distanceToTarget}
            withinRadius={withinRadius}
            isTracker={isWalkTracker}
            language={language}
          />
        ) : null}
      </div>

      <div className="mt-3 space-y-3 px-4 pb-[max(1.5rem,calc(0.75rem+env(safe-area-inset-bottom)))] pt-1">
        <div className="min-w-0">
          <SectionLabel>{t.hub.yourTarget}</SectionLabel>
          <p className="truncate text-lg font-bold text-[var(--cg-fg)]">{targetLevel.title}</p>
        </div>

        {withinRadius ? (
          <div className="cg-animate-pop-in space-y-2">
            <p className="rounded-xl bg-[var(--cg-success)]/20 px-4 py-3 text-center text-base font-semibold">
              {t.hub.arrived}
            </p>
            <BigButton
              variant="accent"
              disabled={disabled || isPending || !sample}
              onClick={() => {
                playPlaySfx("ping");
                openWithSample(sample, routeOrder === "free" ? targetLevel.level : undefined);
              }}
            >
              {t.hub.openWaypoint}
            </BigButton>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-[var(--cg-muted)]">
              {t.hub.walkToPin(playRadius)}
            </p>
            {effectiveHealthBonus > 0 ? (
              <p className="rounded-xl bg-[var(--cg-primary)]/15 px-4 py-3 text-center text-sm font-medium text-[var(--cg-fg)]">
                {t.hub.gpsInaccurate(effectiveHealthBonus)}
              </p>
            ) : null}
            <GpsTroubleBlock
              canUnlock={canUnlockGps || isStudioTest}
              disabled={disabled || isPending}
              onUnlock={() =>
                openWithSample(
                  sample ?? targetLevel.location
                    ? {
                        lat: (sample ?? targetLevel.location)!.lat,
                        lng: (sample ?? targetLevel.location)!.lng,
                        accuracy: sample?.accuracy ?? 5,
                      }
                    : sample,
                  routeOrder === "free" ? targetLevel.level : undefined,
                  "geofence",
                )
              }
              onOpenGpsHelp={onOpenGpsHelp}
              language={language}
            />
            {isStudioTest && targetLevel.location ? (
              <div className="space-y-2 rounded-2xl border border-[var(--cg-primary)]/30 bg-[var(--cg-primary)]/10 px-4 py-3">
                <p className="text-center text-sm font-semibold text-[var(--cg-fg)]">
                  {t.hub.studioTitle}
                </p>
                <BigButton
                  variant="accent"
                  disabled={disabled || isPending}
                  onClick={() =>
                    openWithSample(
                      {
                        lat: targetLevel.location!.lat,
                        lng: targetLevel.location!.lng,
                        accuracy: 5,
                      },
                      routeOrder === "free" ? targetLevel.level : undefined,
                      "geofence",
                    )
                  }
                >
                  {t.hub.studioOpen}
                </BigButton>
              </div>
            ) : process.env.NODE_ENV === "development" && targetLevel.location ? (
              <BigButton
                variant="outline"
                disabled={disabled || isPending}
                onClick={() =>
                  openWithSample(
                    {
                      lat: targetLevel.location!.lat,
                      lng: targetLevel.location!.lng,
                      accuracy: 5,
                    },
                    routeOrder === "free" ? targetLevel.level : undefined,
                  )
                }
              >
                {t.hub.simArrive}
              </BigButton>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function OutdoorTimeWait({
  title,
  levelIndex,
  total,
  minutes,
  disabled,
  isPending,
  onOpen,
  language,
}: {
  title: string;
  levelIndex: number;
  total: number;
  minutes: number;
  disabled: boolean;
  isPending: boolean;
  onOpen: () => void;
  language?: string | null;
}) {
  const t = playUi(language);
  const totalMs = Math.max(1, minutes) * 60_000;
  const started = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const pinged = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Date.now() - started.current);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const progress = Math.min(1, elapsed / totalMs);
  const ready = progress >= 1;
  const remainingSec = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));

  useEffect(() => {
    if (ready && !pinged.current) {
      pinged.current = true;
      playPlaySfx("arrive");
    }
  }, [ready]);

  return (
    <section className="flex min-h-[70vh] flex-col px-5 pb-[max(2rem,calc(1rem+env(safe-area-inset-bottom)))] pt-2">
      <SectionLabel>{t.hub.huntWait}</SectionLabel>
      <h1 className="mt-1 text-xl font-bold text-[var(--cg-fg)]">
        {t.hub.taskOf(levelIndex, total)}
      </h1>
      <p className="mt-6 text-center text-lg font-bold text-[var(--cg-fg)]">{title}</p>
      <p className="mt-8 text-center text-4xl font-bold tabular-nums text-[var(--cg-fg)]">
        {ready
          ? t.hub.waitReady
          : `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, "0")}`}
      </p>
      <div className="mx-auto mt-6 h-2 w-full max-w-sm overflow-hidden rounded-full bg-[var(--cg-secondary)]">
        <div
          className="h-full rounded-full bg-[var(--cg-primary)] transition-[width] duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="mt-4 text-center text-sm text-[var(--cg-muted)]">
        {ready ? t.hub.waitOver : t.hub.waitLeft(minutes)}
      </p>
      {ready ? (
        <div className="cg-animate-pop-in mt-8">
          <BigButton variant="accent" disabled={disabled || isPending} onClick={onOpen}>
            {t.menu.openTask}
          </BigButton>
        </div>
      ) : null}
    </section>
  );
}

function GpsTroubleBlock({
  canUnlock,
  disabled,
  onUnlock,
  onOpenGpsHelp,
  language,
}: {
  canUnlock: boolean;
  disabled: boolean;
  onUnlock?: () => void;
  onOpenGpsHelp?: () => void;
  language?: string | null;
}) {
  const t = playUi(language).hub;
  if (!onOpenGpsHelp && !canUnlock) return null;

  return (
    <div className="space-y-1">
      {onOpenGpsHelp ? (
        <BigButton variant="outline" onClick={onOpenGpsHelp}>
          {t.gpsBroken}
        </BigButton>
      ) : null}
      {canUnlock && onUnlock ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onUnlock}
          className="tap-lift mx-auto block w-full py-2 text-center text-xs font-medium text-[var(--cg-muted)] underline decoration-[var(--cg-border)] underline-offset-4 disabled:opacity-40"
        >
          {t.gpsSkip}
        </button>
      ) : null}
    </div>
  );
}
