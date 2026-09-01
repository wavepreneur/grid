"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Layer } from "leaflet";
import type { GameLevelStatus } from "@/lib/grid/game-state";
import type { GeolocationSample, LevelLocation } from "@/lib/grid/level-types";
import { bearingDegrees, distanceMeters } from "@/lib/grid/geofence";

export type GpsMapWaypoint = {
  level: number;
  lat: number;
  lng: number;
  radiusMeters: number;
  status: GameLevelStatus;
};

type GpsMissionMapProps = {
  waypoints: GpsMapWaypoint[];
  activeLevel: number;
  target?: LevelLocation;
  playerPosition: GeolocationSample | null;
  showPlayer: boolean;
  distanceToTarget: number | null;
  withinRadius: boolean;
  /** Team-lead device owns GPS; others only mirror. */
  isTracker?: boolean;
};

export function GpsMissionMap({
  waypoints,
  activeLevel,
  target,
  playerPosition,
  showPlayer,
  distanceToTarget,
  withinRadius,
  isTracker = false,
}: GpsMissionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<Layer[]>([]);
  const viewKeyRef = useRef<string>("");
  const startDistRef = useRef<number | null>(null);
  const startLevelRef = useRef(activeLevel);
  const [mapReady, setMapReady] = useState(false);

  if (startLevelRef.current !== activeLevel) {
    startLevelRef.current = activeLevel;
    startDistRef.current = null;
  }
  if (distanceToTarget !== null && startDistRef.current === null) {
    startDistRef.current = Math.max(distanceToTarget, 1);
  }

  const bearing =
    playerPosition && target ? bearingDegrees(playerPosition, target) : null;
  const startDist = startDistRef.current;
  const remaining = distanceToTarget !== null ? Math.max(0, Math.round(distanceToTarget)) : null;
  const walked =
    startDist !== null && distanceToTarget !== null
      ? Math.max(0, Math.round(startDist - distanceToTarget))
      : 0;
  const progress =
    startDist && startDist > 0 && distanceToTarget !== null
      ? Math.min(1, Math.max(0, 1 - distanceToTarget / startDist))
      : 0;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        zoomSnap: 0.5,
      });

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 16,
          attribution: "Tiles &copy; Esri",
        },
      ).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    }

    void init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      overlayRef.current = [];
      viewKeyRef.current = "";
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    void import("leaflet").then(({ default: L }) => {
      const map = mapRef.current;
      if (!map) return;

      for (const layer of overlayRef.current) {
        map.removeLayer(layer);
      }
      overlayRef.current = [];

      const active = waypoints.find((waypoint) => waypoint.level === activeLevel);
      const focusLat = playerPosition?.lat ?? active?.lat ?? target?.lat;
      const focusLng = playerPosition?.lng ?? active?.lng ?? target?.lng;

      if (active) {
        const zone = L.circle([active.lat, active.lng], {
          radius: Math.min(active.radiusMeters, 40),
          color: "#166534",
          weight: 2,
          fillColor: "#22c55e",
          fillOpacity: 0.12,
        }).addTo(map);
        overlayRef.current.push(zone);

        const marker = L.circleMarker([active.lat, active.lng], {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: withinRadius ? "#16a34a" : "#166534",
          fillOpacity: 1,
        }).addTo(map);
        overlayRef.current.push(marker);
      }

      if (showPlayer && playerPosition) {
        const player = L.circleMarker([playerPosition.lat, playerPosition.lng], {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#0f172a",
          fillOpacity: 1,
        }).addTo(map);
        overlayRef.current.push(player);

        if (target) {
          const route = L.polyline(
            [
              [playerPosition.lat, playerPosition.lng],
              [target.lat, target.lng],
            ],
            {
              color: withinRadius ? "#16a34a" : "#0f172a",
              weight: 3,
              opacity: 0.55,
              dashArray: withinRadius ? undefined : "8 10",
              lineCap: "round",
            },
          ).addTo(map);
          overlayRef.current.push(route);
        }
      }

      const viewKey = `${activeLevel}:${playerPosition ? "p" : "n"}`;
      if (playerPosition && target) {
        if (viewKeyRef.current !== viewKey) {
          map.fitBounds(
            [
              [playerPosition.lat, playerPosition.lng],
              [target.lat, target.lng],
            ],
            { padding: [48, 48], maxZoom: 16, animate: false },
          );
          viewKeyRef.current = viewKey;
        } else {
          map.panTo([playerPosition.lat, playerPosition.lng], {
            animate: true,
            duration: 0.35,
          });
        }
      } else if (focusLat !== undefined && focusLng !== undefined) {
        if (viewKeyRef.current !== viewKey) {
          map.setView([focusLat, focusLng], 16, { animate: false });
          viewKeyRef.current = viewKey;
        }
      }
    });
  }, [
    mapReady,
    waypoints,
    activeLevel,
    playerPosition,
    showPlayer,
    target,
    withinRadius,
  ]);

  const ringSize = 132;
  const ringStroke = 10;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCirc = 2 * Math.PI * ringRadius;

  return (
    <div className="relative isolate z-0 overflow-hidden rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-card)] shadow-[var(--cg-shadow-soft)]">
      <div ref={containerRef} className="h-[min(38vh,260px)] w-full sm:h-[240px]" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[var(--cg-card)] via-[var(--cg-card)]/90 to-transparent px-4 pb-3 pt-16">
        <div className="flex items-end justify-center gap-4">
          {showPlayer && playerPosition && target && bearing !== null && !withinRadius ? (
            <div className="mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--cg-fg)] text-[var(--cg-bg)] shadow-[var(--cg-shadow-lift)]">
              <svg
                viewBox="0 0 64 64"
                className="h-8 w-8"
                style={{ transform: `rotate(${bearing}deg)` }}
                aria-hidden
              >
                <path d="M32 6 L46 50 L32 40 L18 50 Z" fill="currentColor" />
              </svg>
            </div>
          ) : null}

          <div className="relative">
            <svg
              width={ringSize}
              height={ringSize}
              viewBox={`0 0 ${ringSize} ${ringSize}`}
              className="-rotate-90"
              aria-hidden
            >
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke="var(--cg-secondary)"
                strokeWidth={ringStroke}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke={withinRadius ? "var(--cg-success)" : "var(--cg-primary)"}
                strokeWidth={ringStroke}
                strokeLinecap="round"
                strokeDasharray={ringCirc}
                strokeDashoffset={ringCirc * (1 - (withinRadius ? 1 : progress))}
                style={{ transition: "stroke-dashoffset 0.25s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {withinRadius ? (
                <p className="text-lg font-bold text-[var(--cg-success)]">Am Ziel</p>
              ) : remaining !== null ? (
                <>
                  <p className="text-3xl font-bold tabular-nums leading-none text-[var(--cg-fg)]">
                    {remaining}
                  </p>
                  <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--cg-muted)]">
                    Meter
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--cg-muted)]">GPS…</p>
              )}
            </div>
          </div>
        </div>
        {!withinRadius && remaining !== null ? (
          <p className="mt-2 text-center text-sm tabular-nums text-[var(--cg-muted)]">
            {walked} m gelaufen
            {startDist ? ` · Start ${Math.round(startDist)} m` : ""}
          </p>
        ) : null}
      </div>

      <div className="border-t border-[var(--cg-border)] bg-[var(--cg-secondary)]/60 px-4 py-2.5 text-center text-sm">
        {withinRadius ? (
          <p className="font-medium text-[var(--cg-success)]">Ihr seid am Wegpunkt.</p>
        ) : showPlayer && playerPosition ? (
          <p className="text-[var(--cg-muted)]">
            {isTracker
              ? "Dein Handy zählt die Meter fürs Team — folgt dem Pfeil."
              : "Das Handy vom Team Lead zählt die Meter — folgt dem Pfeil."}
          </p>
        ) : (
          <p className="text-[var(--cg-muted)]">
            {isTracker
              ? "GPS wird gesucht…"
              : "Warten auf die Position vom Team Lead."}
          </p>
        )}
      </div>
    </div>
  );
}

export function buildGpsWaypoints(
  levels: Array<{ level: number; location?: LevelLocation }>,
  levelStatuses: Record<string, { status: GameLevelStatus }>,
): GpsMapWaypoint[] {
  return levels
    .filter((entry) => entry.location)
    .map((entry) => ({
      level: entry.level,
      lat: entry.location!.lat,
      lng: entry.location!.lng,
      radiusMeters: entry.location!.radius_meters,
      status: levelStatuses[String(entry.level)]?.status ?? "locked",
    }));
}

export function computeTargetDistance(
  playerPosition: GeolocationSample | null,
  target?: LevelLocation,
): number | null {
  if (!playerPosition || !target) return null;
  return distanceMeters(playerPosition, target);
}
