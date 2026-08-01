"use client";

import { useMemo, useState } from "react";
import {
  buildGpsWaypoints,
  computeTargetDistance,
  GpsMissionMap,
} from "@/components/game/gps-mission-map";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { IconCheck, IconLock } from "@/components/game/city/icons";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import type { ContentMode } from "@/lib/cms/layer-model";
import type { GameLevelStatus } from "@/lib/grid/game-state";
import type { LevelDefinition, GeolocationSample } from "@/lib/grid/level-types";
import { hubMeta } from "@/lib/grid/play-slots";

type Props = {
  mode: ContentMode;
  levels: LevelDefinition[];
  levelStatuses: Record<string, { status: GameLevelStatus }>;
  activeLevel: number;
  canUnlockGps: boolean;
  disabled: boolean;
  isPending: boolean;
  onArriveOutdoor: (geolocation: GeolocationSample) => void;
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
  canUnlockGps,
  disabled,
  isPending,
  onArriveOutdoor,
  onSolveGpsCheckpoint,
  onOpenStation,
  onSubmitStationCode,
  onStartMission,
}: Props) {
  const meta = hubMeta(mode);
  const current = levels.find((l) => l.level === activeLevel) ?? levels[0];
  const [code, setCode] = useState("");

  if (mode === "outdoor" && current) {
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
        canUnlockGps={canUnlockGps}
        disabled={disabled}
        isPending={isPending}
        onArrive={gpsOnly ? onSolveGpsCheckpoint : onArriveOutdoor}
      />
    );
  }

  if (mode === "indoor") {
    const done = levels.filter((l) => levelStatuses[String(l.level)]?.status === "completed");
    const next = levels.find((l) => levelStatuses[String(l.level)]?.status === "active") ?? current;

    return (
      <section className="flex flex-col gap-4 px-4 pb-6 pt-5">
        <header>
          <SectionLabel>{meta.hubLabelDe}</SectionLabel>
          <h1 className="mt-1 text-xl font-bold text-[var(--cg-fg)]">
            {done.length} von {levels.length} Stationen gelöst
          </h1>
          <p className="mt-2 text-sm text-[var(--cg-muted)]">
            Tippt eine Station an oder gebt den Stationscode ein, der dort aushängt.
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
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-10 pt-5">
      <header>
        <SectionLabel>{meta.hubLabelDe} · Tabbrain</SectionLabel>
        <h1 className="mt-1 text-xl font-bold text-[var(--cg-fg)] sm:text-2xl">
          Mission {next?.level ?? "—"} von {levels.length}
        </h1>
        <p className="mt-2 text-sm text-[var(--cg-muted)]">
          {doneCount} gelöst · gemeinsamer Start auf allen Geräten
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
  canUnlockGps,
  disabled,
  isPending,
  onArrive,
}: {
  levels: LevelDefinition[];
  levelStatuses: Record<string, { status: GameLevelStatus }>;
  current: LevelDefinition;
  canUnlockGps: boolean;
  disabled: boolean;
  isPending: boolean;
  onArrive: (geolocation: GeolocationSample) => void;
}) {
  const gpsEnabled = Boolean(current.location) && canUnlockGps;
  const { sample } = useGeolocation(gpsEnabled);
  const waypoints = useMemo(
    () => buildGpsWaypoints(levels, levelStatuses),
    [levels, levelStatuses],
  );
  const distanceToTarget = computeTargetDistance(sample, current.location);
  const withinRadius =
    sample && current.location && distanceToTarget !== null
      ? distanceToTarget <= current.location.radius_meters
      : false;

  return (
    <section className="flex min-h-[70vh] flex-col">
      <div className="space-y-3 px-4 pb-3 pt-5">
        <header>
          <SectionLabel>Stadtjagd</SectionLabel>
          <h1 className="text-xl font-bold text-[var(--cg-fg)]">
            Wegpunkt {current.level} von {levels.length}
          </h1>
        </header>
      </div>

      <div className="relative min-h-[280px] flex-1">
        {waypoints.length > 0 ? (
          <GpsMissionMap
            waypoints={waypoints}
            activeLevel={current.level}
            target={current.location}
            playerPosition={sample}
            showPlayer={gpsEnabled}
            distanceToTarget={distanceToTarget}
            withinRadius={withinRadius}
          />
        ) : null}
      </div>

      <div className="z-20 space-y-3 rounded-t-3xl bg-[var(--cg-card)] px-4 pb-6 pt-4 shadow-[var(--cg-shadow-lift)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <SectionLabel>Euer Ziel</SectionLabel>
            <p className="truncate text-lg font-bold text-[var(--cg-fg)]">{current.title}</p>
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
              onClick={() => sample && onArrive(sample)}
            >
              Wegpunkt öffnen
            </BigButton>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-[var(--cg-muted)]">
              Lauft zum Wegpunkt. Bei ca. {current.location?.radius_meters ?? 10} m Entfernung
              startet das Level.
            </p>
            {process.env.NODE_ENV === "development" && current.location ? (
              <BigButton
                variant="outline"
                disabled={disabled || isPending}
                onClick={() =>
                  onArrive({
                    lat: current.location!.lat,
                    lng: current.location!.lng,
                    accuracy: 5,
                  })
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
