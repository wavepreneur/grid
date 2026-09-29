"use client";

import { useEffect, useRef, useState } from "react";
import type { Circle, CircleMarker, Map as LeafletMap, Polyline } from "leaflet";
import type { GameLevelStatus } from "@/lib/grid/game-state";
import type { GeolocationSample, LevelLocation } from "@/lib/grid/level-types";
import {
  bearingDegrees,
  distanceMeters,
  PLAY_LIVE_MAP_MAX_METERS,
} from "@/lib/grid/geofence";
import { playUi } from "@/lib/grid/play-ui";

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
  language?: string | null;
};

type LeafletNS = typeof import("leaflet");

export function GpsMissionMap({
  waypoints,
  activeLevel,
  target,
  playerPosition,
  showPlayer,
  distanceToTarget,
  withinRadius,
  isTracker = false,
  language,
}: GpsMissionMapProps) {
  const t = playUi(language).hub;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletNS | null>(null);
  const targetKeyRef = useRef("");
  const playerMarkerRef = useRef<CircleMarker | null>(null);
  const routeRef = useRef<Polyline | null>(null);
  const targetLayersRef = useRef<Array<Circle | CircleMarker>>([]);
  const lastPanRef = useRef("");
  const startDistRef = useRef<number | null>(null);
  const startLevelRef = useRef(activeLevel);
  const [mapReady, setMapReady] = useState(false);

  const isFar =
    distanceToTarget !== null && distanceToTarget > PLAY_LIVE_MAP_MAX_METERS;

  if (startLevelRef.current !== activeLevel) {
    startLevelRef.current = activeLevel;
    startDistRef.current = null;
  }
  if (isFar) {
    startDistRef.current = null;
  } else if (distanceToTarget !== null && startDistRef.current === null) {
    startDistRef.current = Math.max(distanceToTarget, 1);
  }

  const bearing =
    !isFar && playerPosition && target ? bearingDegrees(playerPosition, target) : null;
  const startDist = startDistRef.current;
  const remaining = distanceToTarget !== null ? Math.max(0, Math.round(distanceToTarget)) : null;
  const walked =
    !isFar && startDist !== null && distanceToTarget !== null
      ? Math.max(0, Math.round(startDist - distanceToTarget))
      : 0;
  const progress =
    !isFar && startDist && startDist > 0 && distanceToTarget !== null
      ? Math.min(1, Math.max(0, 1 - distanceToTarget / startDist))
      : 0;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      const leafletMod = await import("leaflet");
      const L = (leafletMod as LeafletNS & { default?: LeafletNS }).default ?? leafletMod;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        zoomSnap: 0.5,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 16,
          attribution: "Tiles &copy; Esri",
        },
      ).addTo(map);

      leafletRef.current = L;
      mapRef.current = map;
      setMapReady(true);
    }

    void init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      playerMarkerRef.current = null;
      routeRef.current = null;
      targetLayersRef.current = [];
      targetKeyRef.current = "";
      lastPanRef.current = "";
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    const active = waypoints.find((waypoint) => waypoint.level === activeLevel);
    const targetKey = `${activeLevel}:${withinRadius ? "in" : "out"}`;
    if (targetKeyRef.current !== targetKey) {
      for (const layer of targetLayersRef.current) {
        map.removeLayer(layer);
      }
      targetLayersRef.current = [];
      targetKeyRef.current = targetKey;

      if (active) {
        const zone = L.circle([active.lat, active.lng], {
          radius: Math.min(active.radiusMeters, 40),
          color: "#166534",
          weight: 2,
          fillColor: "#22c55e",
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map);

        const pin = L.circleMarker([active.lat, active.lng], {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: withinRadius ? "#16a34a" : "#166534",
          fillOpacity: 1,
          interactive: false,
        }).addTo(map);
        targetLayersRef.current.push(zone, pin);
      }
    }

    const showLive = Boolean(showPlayer && playerPosition && target && !isFar);
    if (showLive && playerPosition && target) {
      if (playerMarkerRef.current) {
        playerMarkerRef.current.setLatLng([playerPosition.lat, playerPosition.lng]);
      } else {
        playerMarkerRef.current = L.circleMarker([playerPosition.lat, playerPosition.lng], {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#0f172a",
          fillOpacity: 1,
          interactive: false,
        }).addTo(map);
      }

      const line: [number, number][] = [
        [playerPosition.lat, playerPosition.lng],
        [target.lat, target.lng],
      ];
      if (routeRef.current) {
        routeRef.current.setLatLngs(line);
        routeRef.current.setStyle({
          color: withinRadius ? "#16a34a" : "#0f172a",
          dashArray: withinRadius ? undefined : "8 10",
        });
      } else {
        routeRef.current = L.polyline(line, {
          color: withinRadius ? "#16a34a" : "#0f172a",
          weight: 3,
          opacity: 0.55,
          dashArray: withinRadius ? undefined : "8 10",
          lineCap: "round",
          interactive: false,
        }).addTo(map);
      }
    } else {
      if (playerMarkerRef.current) {
        map.removeLayer(playerMarkerRef.current);
        playerMarkerRef.current = null;
      }
      if (routeRef.current) {
        map.removeLayer(routeRef.current);
        routeRef.current = null;
      }
    }

    const focus = active ?? target;
    if (showLive && playerPosition && target) {
      const viewKey = `live:${activeLevel}`;
      if (lastPanRef.current !== viewKey) {
        lastPanRef.current = viewKey;
        map.fitBounds(
          [
            [playerPosition.lat, playerPosition.lng],
            [target.lat, target.lng],
          ],
          { padding: [48, 48], maxZoom: 16, animate: false },
        );
      }
    } else if (focus) {
      const viewKey = `t:${activeLevel}:${focus.lat.toFixed(5)},${focus.lng.toFixed(5)}`;
      if (lastPanRef.current !== viewKey) {
        lastPanRef.current = viewKey;
        map.setView([focus.lat, focus.lng], 16, { animate: false });
      }
    }
  }, [
    mapReady,
    waypoints,
    activeLevel,
    playerPosition,
    showPlayer,
    target,
    withinRadius,
    isFar,
  ]);

  const ringSize = 72;
  const ringStroke = 7;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCirc = 2 * Math.PI * ringRadius;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-card)] shadow-[var(--cg-shadow-soft)]">
      <div className="relative">
        <div
          ref={containerRef}
          className="pointer-events-none h-[min(36vh,240px)] w-full touch-manipulation sm:h-[220px]"
        />
        {showPlayer && playerPosition && target && bearing !== null && !withinRadius ? (
          <div className="pointer-events-none absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--cg-fg)] text-[var(--cg-bg)] shadow-[var(--cg-shadow-lift)]">
            <svg
              viewBox="0 0 64 64"
              className="h-7 w-7"
              style={{ transform: `rotate(${bearing}deg)` }}
              aria-hidden
            >
              <path d="M32 6 L46 50 L32 40 L18 50 Z" fill="currentColor" />
            </svg>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--cg-border)] px-4 py-3">
        <div className="relative shrink-0">
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
              <p className="text-[0.65rem] font-bold text-[var(--cg-success)]">{t.mapTarget}</p>
            ) : isFar ? (
              <p className="text-[0.65rem] text-[var(--cg-muted)]">GPS</p>
            ) : remaining !== null ? (
              <p className="text-base font-bold tabular-nums leading-none text-[var(--cg-fg)]">
                {remaining}
              </p>
            ) : (
              <p className="text-[0.65rem] text-[var(--cg-muted)]">GPS</p>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 text-sm">
          {withinRadius ? (
            <p className="font-medium text-[var(--cg-success)]">{t.mapAtPoint}</p>
          ) : isFar ? (
            <p className="text-[var(--cg-muted)]">{t.mapFar}</p>
          ) : remaining !== null ? (
            <>
              <p className="font-semibold tabular-nums text-[var(--cg-fg)]">
                {t.mapWalked(walked, startDist ? Math.round(startDist) : null)}
              </p>
              <p className="mt-0.5 text-[var(--cg-muted)]">
                {isTracker ? t.mapLeadCounts : t.mapFollowCounts}
              </p>
            </>
          ) : (
            <p className="text-[var(--cg-muted)]">
              {isTracker ? t.mapSearching : t.mapWaitLead}
            </p>
          )}
        </div>
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
