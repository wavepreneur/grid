"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Layer } from "leaflet";
import type { GameLevelStatus } from "@/lib/grid/game-state";
import type { GeolocationSample, LevelLocation } from "@/lib/grid/level-types";
import { distanceMeters, formatDistance } from "@/lib/grid/geofence";

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
};

function markerColor(status: GameLevelStatus, isActive: boolean): string {
  if (isActive) return "#34d399";
  if (status === "completed") return "#60a5fa";
  return "#94a3b8";
}

export function GpsMissionMap({
  waypoints,
  activeLevel,
  target,
  playerPosition,
  showPlayer,
  distanceToTarget,
  withinRadius,
}: GpsMissionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<Layer[]>([]);

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
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(map);

      mapRef.current = map;
    }

    void init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      overlayRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    void import("leaflet").then(({ default: L }) => {
      const map = mapRef.current;
      if (!map) return;

      for (const layer of overlayRef.current) {
        map.removeLayer(layer);
      }
      overlayRef.current = [];

      const boundsPoints: [number, number][] = [];

      for (const waypoint of waypoints) {
        const isActive = waypoint.level === activeLevel;
        const color = markerColor(waypoint.status, isActive);

        const zone = L.circle([waypoint.lat, waypoint.lng], {
          radius: waypoint.radiusMeters,
          color,
          weight: isActive ? 2 : 1,
          fillColor: color,
          fillOpacity: isActive ? 0.18 : 0.08,
        }).addTo(map);
        overlayRef.current.push(zone);

        const marker = L.circleMarker([waypoint.lat, waypoint.lng], {
          radius: isActive ? 11 : 8,
          color: "#ffffff",
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        }).addTo(map);
        marker.bindTooltip(`Level ${waypoint.level}`, { direction: "top", offset: [0, -8] });
        overlayRef.current.push(marker);

        boundsPoints.push([waypoint.lat, waypoint.lng]);
      }

      if (showPlayer && playerPosition) {
        const player = L.circleMarker([playerPosition.lat, playerPosition.lng], {
          radius: 9,
          color: "#ffffff",
          weight: 3,
          fillColor: "#3b82f6",
          fillOpacity: 1,
        }).addTo(map);
        overlayRef.current.push(player);

        if (playerPosition.accuracy && playerPosition.accuracy > 0) {
          const accuracy = L.circle([playerPosition.lat, playerPosition.lng], {
            radius: playerPosition.accuracy,
            color: "#3b82f6",
            weight: 1,
            fillColor: "#3b82f6",
            fillOpacity: 0.12,
          }).addTo(map);
          overlayRef.current.push(accuracy);
        }

        boundsPoints.push([playerPosition.lat, playerPosition.lng]);
      }

      if (boundsPoints.length > 0) {
        map.fitBounds(boundsPoints, { padding: [36, 36], maxZoom: 16 });
      } else if (target) {
        map.setView([target.lat, target.lng], 15);
      }
    });
  }, [waypoints, activeLevel, playerPosition, showPlayer, target]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--grid-border)] bg-black/20">
      <div ref={containerRef} className="h-[min(52vh,360px)] w-full sm:h-[320px] lg:h-[280px]" />
      {showPlayer && target ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--grid-border)] bg-black/40 px-4 py-3 text-sm">
          <p className="text-[var(--grid-muted)]">
            Entfernung zum Ziel:{" "}
            <span className="font-medium text-white">
              {distanceToTarget !== null ? formatDistance(distanceToTarget) : "—"}
            </span>
          </p>
          <p>
            {withinRadius ? (
              <span className="text-emerald-300">Im Checkpoint-Bereich</span>
            ) : (
              <span className="text-amber-300">Unterwegs zum Ziel</span>
            )}
          </p>
        </div>
      ) : (
        <div className="border-t border-[var(--grid-border)] bg-black/40 px-4 py-3 text-sm text-[var(--grid-muted)]">
          Route-Übersicht — der Team Lead (GPS) navigiert zum grün markierten Checkpoint.
        </div>
      )}
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
