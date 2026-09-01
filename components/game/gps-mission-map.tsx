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

function CompassArrow({ degrees }: { degrees: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-14 w-14"
      style={{ transform: `rotate(${degrees}deg)` }}
      aria-hidden
    >
      <path
        d="M32 6 L46 50 L32 40 L18 50 Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
  const [mapReady, setMapReady] = useState(false);

  const bearing =
    playerPosition && target ? bearingDegrees(playerPosition, target) : null;

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

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
        subdomains: "abcd",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

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
            { padding: [48, 48], maxZoom: 17, animate: false },
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

  const metersLabel =
    distanceToTarget !== null ? `${Math.round(distanceToTarget)} m` : null;

  return (
    <div className="relative isolate z-0 overflow-hidden rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-card)] shadow-[var(--cg-shadow-soft)]">
      <div ref={containerRef} className="h-[min(46vh,320px)] w-full sm:h-[300px] lg:h-[260px]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 p-3">
        {metersLabel ? (
          <span
            className={`rounded-full px-5 py-2 text-lg font-bold tabular-nums shadow-[var(--cg-shadow-lift)] ${
              withinRadius
                ? "bg-[var(--cg-success)] text-white"
                : "bg-[var(--cg-fg)] text-[var(--cg-bg)]"
            }`}
          >
            {withinRadius ? "Am Ziel" : metersLabel}
          </span>
        ) : null}
        {showPlayer && playerPosition && target && bearing !== null && !withinRadius ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cg-fg)] text-[var(--cg-bg)] shadow-[var(--cg-shadow-lift)]">
            <CompassArrow degrees={bearing} />
          </div>
        ) : null}
      </div>

      <div className="border-t border-[var(--cg-border)] bg-[var(--cg-secondary)]/60 px-4 py-2.5 text-center text-sm">
        {withinRadius ? (
          <p className="font-medium text-[var(--cg-success)]">Ihr seid am Wegpunkt.</p>
        ) : showPlayer && playerPosition ? (
          <p className="text-[var(--cg-muted)]">
            {isTracker
              ? "Dein Handy zeigt den Weg fürs Team — folgt dem Pfeil."
              : "Das Handy vom Team Lead zeigt den Weg — folgt dem Pfeil."}
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
