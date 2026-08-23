"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildGpsWaypoints,
  computeTargetDistance,
  GpsMissionMap,
} from "@/components/game/gps-mission-map";
import { OutdoorWalkRing } from "@/components/game/outdoor-walk-ring";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { IconCheck, IconLock } from "@/components/game/city/icons";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { useWalkedDistance } from "@/lib/hooks/use-walked-distance";
import type { ContentMode } from "@/lib/cms/layer-model";
import { isWithinGeofence } from "@/lib/grid/geofence";
import { playPlaySfx } from "@/lib/grid/play-sfx";
import type { GameLevelStatus } from "@/lib/grid/game-state";
import type { LevelDefinition, GeolocationSample } from "@/lib/grid/level-types";
import { hubMeta } from "@/lib/grid/play-slots";

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
  onArriveOutdoor: (geolocation: GeolocationSample, targetLevel?: number) => void;
  onSolveGpsCheckpoint: (geolocation: GeolocationSample) => void;
  onOpenStation: (levelNumber: number) => void;
  onSubmitStationCode: (code: string) => void;
  onStartMission: (levelNumber: number) => void;
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
  onArriveOutdoor,
  onSolveGpsCheckpoint,
  onOpenStation,
  onSubmitStationCode,
  onStartMission,
}: Props) {
  const meta = hubMeta(mode);
  const current = levels.find((l) => l.level === activeLevel) ?? levels[0];
  const [code, setCode] = useState("");

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
        disabled={disabled}
        isPending={isPending}
        walkStorageKey={walkStorageKey}
        onArrive={
          gpsOnly
            ? (geo) => onSolveGpsCheckpoint(geo)
            : (geo, level) => onArriveOutdoor(geo, level)
        }
      />
    );
  }

  if (mode === "indoor") {
    const done = levels.filter((l) => levelStatuses[String(l.level)]?.status === "completed");
    const next = levels.find((l) => levelStatuses[String(l.level)]?.status === "active") ?? current;

    return (
      <section className="flex flex-col gap-4 px-4 pb-[max(1.5rem,calc(0.75rem+env(safe-area-inset-bottom)))] pt-2">
        <header>
          <SectionLabel>{meta.hubLabelDe}</SectionLabel>
          <h1 className="mt-1 text-xl font-bold text-[var(--cg-fg)]">
            {done.length} von {levels.length} Stationen gelöst
          </h1>
          <p className="mt-2 text-sm text-[var(--cg-muted)]">
            Tippt eine Station an oder gebt den Stationscode ein, der dort aushängt.
            {routeOrder === "free" ? " Freie Reihenfolge — jede offene Station ist wählbar." : ""}
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
                    : status === "active"
                      ? "bg-[var(--cg-primary)]"
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
            const isActive = status === "active";
            const locked = status === "locked";
            return (
              <li key={s.level}>
                <button
                  type="button"
                  disabled={disabled || isPending || locked}
                  onClick={() => onOpenStation(s.level)}
                  className={`cg-tap-lift grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border-2 p-4 text-left ${
                    isDone
                      ? "border-[var(--cg-success)]/40 bg-[var(--cg-success)]/10"
                      : isActive
                        ? "border-[var(--cg-primary)] bg-[var(--cg-card)] shadow-[var(--cg-shadow-lift)]"
                        : "border-[var(--cg-border)] bg-[var(--cg-secondary)] opacity-60"
                  }`}
                >
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold ${
                      isDone
                        ? "bg-[var(--cg-success)] text-[var(--cg-primary-fg)]"
                        : locked
                          ? "bg-[var(--cg-card)] text-[var(--cg-muted)]"
                          : "bg-[var(--cg-primary)] text-[var(--cg-primary-fg)]"
                    }`}
                  >
                    {isDone ? <IconCheck size={28} /> : locked ? <IconLock size={24} /> : s.level}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-bold text-[var(--cg-fg)]">
                      {s.station?.name ?? s.title}
                    </span>
                    <span className="block truncate text-sm text-[var(--cg-muted)]">
                      {s.station?.place ?? "—"}
                      {s.station?.code ? ` · Code ${s.station.code}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-[var(--cg-muted)]">
                    {isDone ? "gelöst" : `${s.station?.points ?? "—"} P`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="space-y-3 rounded-t-3xl bg-[var(--cg-card)] px-1 pt-2 shadow-[var(--cg-shadow-lift)]">
          {next ? (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1">
                <div className="min-w-0">
                  <SectionLabel>Vorschlag</SectionLabel>
                  <p className="truncate text-lg font-bold text-[var(--cg-fg)]">
                    {next.station?.name ?? next.title}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--cg-secondary)] px-3 py-1.5 text-sm font-semibold">
                  {next.station?.place ?? ""}
                </span>
              </div>
              <BigButton variant="accent" disabled={disabled || isPending} onClick={() => onOpenStation(next.level)}>
                Station starten
              </BigButton>
              <div className="space-y-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Stationscode z. B. A1"
                  className="w-full rounded-2xl border-2 border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-4 text-center text-xl font-bold uppercase tracking-[0.3em] outline-none focus:border-[var(--cg-primary)]"
                />
                <BigButton
                  variant="outline"
                  disabled={disabled || isPending || !code.trim()}
                  onClick={() => onSubmitStationCode(code)}
                >
                  Stationscode eingeben
                </BigButton>
              </div>
            </>
          ) : (
            <p className="rounded-2xl bg-[var(--cg-success)]/20 px-4 py-4 text-center text-base font-bold">
              Alle Stationen gelöst — auf zur Auswertung!
            </p>
          )}
        </div>
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
  disabled,
  isPending,
  walkStorageKey,
  onArrive,
}: {
  levels: LevelDefinition[];
  levelStatuses: Record<string, { status: GameLevelStatus }>;
  current: LevelDefinition;
  routeOrder: "linear" | "free";
  canUnlockGps: boolean;
  disabled: boolean;
  isPending: boolean;
  walkStorageKey?: string | null;
  onArrive: (geolocation: GeolocationSample, targetLevel?: number) => void;
}) {
  const isWalkMode =
    current.triggers?.type === "distance" &&
    Boolean(current.triggers.after_meters && current.triggers.after_meters > 0);
  const isTimeMode =
    current.triggers?.type === "time" &&
    Boolean(current.triggers.after_minutes && current.triggers.after_minutes > 0);
  const isGpsMode = Boolean(current.location) && !isWalkMode;

  const gpsEnabled = (isGpsMode || isWalkMode) && canUnlockGps;
  const { sample } = useGeolocation(gpsEnabled && isGpsMode);
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
  const arrivedPingRef = useRef(false);

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
      return isWithinGeofence(sample, level.location);
    });
    return hit ?? current;
  }, [isGpsMode, routeOrder, sample, levels, levelStatuses, current]);

  const distanceToTarget = computeTargetDistance(sample, targetLevel.location);
  const withinRadius =
    sample && targetLevel.location && distanceToTarget !== null
      ? distanceToTarget <= targetLevel.location.radius_meters
      : false;

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

  const targetMeters = current.triggers?.after_meters ?? 100;
  const walkedMeters = walk.displayMeters + simBonus;

  function openWithSample(geo?: GeolocationSample | null, level?: number) {
    const position =
      geo ??
      walk.sample ??
      sample ??
      ({ lat: 0, lng: 0, accuracy: 50 } satisfies GeolocationSample);
    onArrive(position, level);
  }

  if (isWalkMode) {
    return (
      <section className="flex min-h-[70vh] flex-col">
        <div className="space-y-1 px-4 pb-2 pt-2">
          <SectionLabel>Stadtjagd · Strecke</SectionLabel>
          <h1 className="text-xl font-bold text-[var(--cg-fg)]">
            Wegpunkt {current.level} von {levels.length}
          </h1>
        </div>
        <OutdoorWalkRing
          title={current.title}
          targetMeters={targetMeters}
          walkedMeters={walkedMeters}
          disabled={disabled}
          isPending={isPending}
          onOpen={() => openWithSample(walk.sample, current.level)}
          onSimulateWalk={() => setSimBonus((m) => m + 1)}
        />
        {walk.error ? (
          <p className="px-5 pb-6 text-center text-sm text-[var(--cg-destructive)]">{walk.error}</p>
        ) : null}
        {!canUnlockGps ? (
          <p className="px-5 pb-6 text-center text-sm text-[var(--cg-muted)]">
            Nur Alpha / GPS-Leiter kann die Strecke tracken — bitte Gerät mit Freigabe nutzen.
          </p>
        ) : null}
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
    <section className="flex min-h-[70vh] flex-col">
      <div className="space-y-3 px-4 pb-3 pt-2">
        <header>
          <SectionLabel>Stadtjagd</SectionLabel>
          <h1 className="text-xl font-bold text-[var(--cg-fg)]">
            {routeOrder === "free"
              ? `${openCount} von ${levels.length} Wegpunkten offen`
              : `Wegpunkt ${current.level} von ${levels.length}`}
          </h1>
          <p className="mt-1 text-sm text-[var(--cg-muted)]">
            {routeOrder === "free"
              ? "Alle offenen Punkte sind anlaufbar — Marker und Linie zeigen euer Ziel."
              : "Folgt der Linie zum hervorgehobenen Ziel. Die Distanz aktualisiert sich live."}
          </p>
        </header>
      </div>

      <div className="relative min-h-[280px] flex-1 px-4">
        {waypoints.length > 0 ? (
          <GpsMissionMap
            waypoints={waypoints}
            activeLevel={targetLevel.level}
            target={targetLevel.location}
            playerPosition={sample}
            showPlayer={gpsEnabled}
            distanceToTarget={distanceToTarget}
            withinRadius={withinRadius}
          />
        ) : null}
      </div>

      <div className="z-20 space-y-3 rounded-t-3xl bg-[var(--cg-card)] px-4 pb-[max(1.5rem,calc(0.75rem+env(safe-area-inset-bottom)))] pt-4 shadow-[var(--cg-shadow-lift)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <SectionLabel>Euer Ziel</SectionLabel>
            <p className="truncate text-lg font-bold text-[var(--cg-fg)]">{targetLevel.title}</p>
          </div>
          {distanceToTarget !== null ? (
            <span className="shrink-0 rounded-full bg-[var(--cg-secondary)] px-3 py-1.5 text-sm font-semibold">
              ca. {Math.round(distanceToTarget)} m
            </span>
          ) : null}
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
              Lauft zum Wegpunkt. Bei ca. {targetLevel.location?.radius_meters ?? 10} m piept es und
              ihr könnt öffnen.
            </p>
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
        Wegpunkt {levelIndex} von {total}
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
