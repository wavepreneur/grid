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
import type { GameLevelStatus } from "@/lib/grid/game-state";
import type { LevelDefinition, GeolocationSample } from "@/lib/grid/level-types";
import type { GpsFixPayload } from "@/lib/hooks/use-team-sync";
import { hubMeta } from "@/lib/grid/play-slots";
import { GPS_SETTINGS_TIP } from "@/lib/grid/play-help";

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
}: Props) {
  const meta = hubMeta(mode);
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
          <SectionLabel>{meta.hubLabelDe}</SectionLabel>
          <h1 className="mt-1 text-xl font-bold text-[var(--cg-fg)]">
            {done.length} von {levels.length} Stationen gelöst
          </h1>
          <p className="mt-2 text-sm text-[var(--cg-muted)]">
            {free
              ? "Sucht den Zettel im Raum, tippt die Station an und gebt den Code ein."
              : "Der nächste Punkt ist frei. Sucht den Zettel, tippt die Station an, Code eingeben."}
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
                          ? "Gelöst"
                          : flashWrong
                            ? "Falsch"
                            : locked
                              ? "Noch gesperrt — erst die Station davor"
                              : s.station?.place?.trim() || "Zettel suchen, dann Code"}
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
                          Falsch
                        </p>
                      ) : (
                        <>
                          <p className="text-sm text-[var(--cg-muted)]">
                            Code vom Zettel dieser Station — 4 Zeichen, Zahlen und Buchstaben.
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
                            Code prüfen
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
            Alle Stationen gelöst — auf zur Auswertung!
          </p>
        ) : next && !free ? (
          <p className="text-center text-sm text-[var(--cg-muted)]">
            Als Nächstes: {next.station?.name ?? next.title}
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
        <SectionLabel>{meta.hubLabelDe}</SectionLabel>
        <h1 className="mt-1 text-xl font-bold text-[var(--cg-fg)] sm:text-2xl">
          Mission {next?.level ?? "—"} von {levels.length}
        </h1>
        <p className="mt-2 text-sm text-[var(--cg-muted)]">
          {doneCount} gelöst · Tippt auf Start, um Quiz und Level zu öffnen.
        </p>
      </header>

      {next ? (
        <div className="rounded-3xl border-2 border-[var(--cg-primary)] bg-[var(--cg-card)] p-5 shadow-[var(--cg-shadow-lift)] sm:p-7">
          <SectionLabel>
            Mission {next.level} von {levels.length}
          </SectionLabel>
          <h2 className="mt-1 text-2xl font-bold text-[var(--cg-fg)] sm:text-3xl">{next.title}</h2>
          <p className="mt-2 text-base text-[var(--cg-muted)] sm:text-lg">
            {next.teaser ?? next.description}
          </p>
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
              Mission starten
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
}) {
  const isWalkMode =
    current.triggers?.type === "distance" &&
    Boolean(current.triggers.after_meters && current.triggers.after_meters > 0);
  const isTimeMode =
    current.triggers?.type === "time" &&
    Boolean(current.triggers.after_minutes && current.triggers.after_minutes > 0);
  const isGpsMode = Boolean(current.location) && !isWalkMode;

  const gpsEnabled = (isGpsMode || isWalkMode) && isWalkTracker;
  const { sample: leadSample, error: gpsError } = useGeolocation(gpsEnabled && isGpsMode);
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
  const [simBonus, setSimBonus] = useState(0);
  const [healthBonus, setHealthBonus] = useState(0);
  const arrivedPingRef = useRef(false);
  const lastReportRef = useRef(0);
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
      onBroadcastGpsFix({
        level: targetLevel.level,
        lat: geo.lat,
        lng: geo.lng,
        accuracy: geo.accuracy,
        distance_m: dist,
        within_radius: isWithinGeofenceForPlay(geo, healthLoc),
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
          <SectionLabel>Stadtjagd · Strecke</SectionLabel>
          <h1 className="text-xl font-bold text-[var(--cg-fg)]">
            Aufgabe {current.level} von {levels.length}
          </h1>
        </div>
        <OutdoorWalkRing
          title={current.title}
          targetMeters={targetMeters}
          walkedMeters={walkedMeters}
          disabled={disabled}
          isPending={isPending}
          gpsError={walk.error}
          showForceOpen={isWalkTracker}
          onOpen={() => openWithSample(walk.sample, current.level)}
          onForceOpen={() => openWithSample(walk.sample, current.level, "distance")}
          onSimulateWalk={
            isWalkTracker ? () => setSimBonus((m) => m + 25) : undefined
          }
        />
        <p className="px-5 pb-6 text-center text-sm text-[var(--cg-muted)]">
          {isWalkTracker
            ? "Dein Handy zählt die Meter fürs ganze Team. Die anderen Geräte folgen diesem Stand."
            : "Das Handy vom Team Lead zählt die Strecke. Euer Ring zeigt denselben Stand."}
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
      />
    );
  }

  return (
    <section className="flex flex-col">
      <div className="space-y-3 px-4 pb-3 pt-2">
        <header>
          <SectionLabel>Stadtjagd</SectionLabel>
          <h1 className="text-xl font-bold text-[var(--cg-fg)]">
            {routeOrder === "free"
              ? `${openCount} von ${levels.length} Aufgaben offen`
              : `Aufgabe ${current.level} von ${levels.length}`}
          </h1>
          <p className="mt-1 text-sm text-[var(--cg-muted)]">
            {routeOrder === "free"
              ? "Lauft zum nächsten offenen Punkt — Pfeil und Meter kommen vom Team Lead."
              : "Folgt dem Pfeil. Die Meter zählen auf dem Handy vom Team Lead."}
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
          />
        ) : null}
      </div>

      <div className="mt-3 space-y-3 px-4 pb-[max(1.5rem,calc(0.75rem+env(safe-area-inset-bottom)))] pt-1">
        <div className="min-w-0">
          <SectionLabel>Euer Ziel</SectionLabel>
          <p className="truncate text-lg font-bold text-[var(--cg-fg)]">{targetLevel.title}</p>
        </div>

        {withinRadius ? (
          <div className="cg-animate-pop-in space-y-2">
            <p className="rounded-xl bg-[var(--cg-success)]/20 px-4 py-3 text-center text-base font-semibold">
              Ihr seid da! Der Wegpunkt hat sich aktiviert.
            </p>
            <BigButton
              variant="accent"
              disabled={disabled || isPending || !sample}
              onClick={() => {
                playPlaySfx("ping");
                openWithSample(sample, routeOrder === "free" ? targetLevel.level : undefined);
              }}
            >
              Wegpunkt öffnen
            </BigButton>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-[var(--cg-muted)]">
              Lauft zum Wegpunkt. Bei ca. {playRadius} m piept es und ihr könnt öffnen.
            </p>
            {effectiveHealthBonus > 0 ? (
              <p className="rounded-xl bg-[var(--cg-primary)]/15 px-4 py-3 text-center text-sm font-medium text-[var(--cg-fg)]">
                GPS ungenau — Radius automatisch um {effectiveHealthBonus} m erweitert.
              </p>
            ) : null}
            <GpsTroubleBlock
              canUnlock={canUnlockGps}
              disabled={disabled || isPending}
              gpsError={isWalkTracker ? gpsError : null}
              onUnlock={() =>
                openWithSample(
                  sample,
                  routeOrder === "free" ? targetLevel.level : undefined,
                  "geofence",
                )
              }
            />
            {process.env.NODE_ENV === "development" && targetLevel.location ? (
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
                Ankunft simulieren (Dev)
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
}: {
  title: string;
  levelIndex: number;
  total: number;
  minutes: number;
  disabled: boolean;
  isPending: boolean;
  onOpen: () => void;
}) {
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
      <SectionLabel>Stadtjagd · Wartezeit</SectionLabel>
      <h1 className="mt-1 text-xl font-bold text-[var(--cg-fg)]">
        Aufgabe {levelIndex} von {total}
      </h1>
      <p className="mt-6 text-center text-lg font-bold text-[var(--cg-fg)]">{title}</p>
      <p className="mt-8 text-center text-4xl font-bold tabular-nums text-[var(--cg-fg)]">
        {ready
          ? "Bereit"
          : `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, "0")}`}
      </p>
      <div className="mx-auto mt-6 h-2 w-full max-w-sm overflow-hidden rounded-full bg-[var(--cg-secondary)]">
        <div
          className="h-full rounded-full bg-[var(--cg-primary)] transition-[width] duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="mt-4 text-center text-sm text-[var(--cg-muted)]">
        {ready
          ? "Zeit abgelaufen — öffnet die Aufgabe."
          : `Noch ca. ${minutes} Min. nach der vorherigen Aufgabe warten.`}
      </p>
      {ready ? (
        <div className="cg-animate-pop-in mt-8">
          <BigButton variant="accent" disabled={disabled || isPending} onClick={onOpen}>
            Aufgabe öffnen
          </BigButton>
        </div>
      ) : null}
    </section>
  );
}

function GpsTroubleBlock({
  canUnlock,
  disabled,
  gpsError,
  onUnlock,
}: {
  canUnlock: boolean;
  disabled: boolean;
  gpsError: string | null;
  onUnlock: () => void;
}) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const [choice, setChoice] = useState<"here" | "broken" | null>(null);
  const open = userOpen ?? Boolean(gpsError);
  const effectiveChoice = choice ?? (gpsError ? "broken" : null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          setUserOpen(!open);
          if (open) setChoice(null);
        }}
        className="tap-lift w-full rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3 text-left"
      >
        <span className="block text-sm font-bold text-[var(--cg-fg)]">GPS-Problem?</span>
        <span className="mt-0.5 block text-xs text-[var(--cg-muted)]">
          Wir stehen davor, oder der Standort kommt nicht — kurze Auswahl.
        </span>
      </button>

      {open ? (
        <div className="space-y-2 rounded-2xl bg-[var(--cg-secondary)] px-3 py-3">
          <button
            type="button"
            onClick={() => setChoice("here")}
            className={`tap-lift w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
              effectiveChoice === "here"
                ? "bg-[var(--cg-card)] text-[var(--cg-fg)] ring-1 ring-[var(--cg-primary)]/40"
                : "text-[var(--cg-fg)]"
            }`}
          >
            Wir stehen direkt davor — GPS greift nicht
          </button>
          <button
            type="button"
            onClick={() => setChoice("broken")}
            className={`tap-lift w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
              effectiveChoice === "broken"
                ? "bg-[var(--cg-card)] text-[var(--cg-fg)] ring-1 ring-[var(--cg-primary)]/40"
                : "text-[var(--cg-fg)]"
            }`}
          >
            GPS funktioniert nicht richtig
          </button>

          {effectiveChoice === "here" ? (
            <div className="space-y-2 pt-1">
              {canUnlock ? (
                <BigButton variant="outline" disabled={disabled} onClick={onUnlock}>
                  Aufgabe freischalten
                </BigButton>
              ) : (
                <p className="text-center text-xs text-[var(--cg-muted)]">
                  Alpha / GPS-Leiter schaltet den Punkt fürs Team frei.
                </p>
              )}
            </div>
          ) : null}

          {effectiveChoice === "broken" ? (
            <div className="space-y-2 pt-1">
              {gpsError ? (
                <p className="text-center text-xs font-semibold text-[var(--cg-fg)]">{gpsError}</p>
              ) : null}
              <p className="text-center text-xs leading-snug text-[var(--cg-muted)]">
                {GPS_SETTINGS_TIP}
              </p>
              {canUnlock ? (
                <BigButton variant="outline" disabled={disabled} onClick={onUnlock}>
                  Ohne GPS freischalten
                </BigButton>
              ) : (
                <p className="text-center text-xs text-[var(--cg-muted)]">
                  Ohne GPS: Alpha tippt „Aufgabe freischalten“.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
