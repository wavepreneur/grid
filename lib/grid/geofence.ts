import type { GeolocationSample, LevelLocation } from "@/lib/grid/level-types";

const EARTH_RADIUS_METERS = 6_371_000;

/** Floor for player unlock radius outdoors (phone drift). */
const PLAY_MIN_RADIUS_METERS = 25;
const PLAY_ACCURACY_PADDING_FACTOR = 0.55;
const PLAY_ACCURACY_PADDING_CAP_METERS = 45;

/** Cap for lead-device health expansion when the geofence hangs. */
export const HEALTH_RADIUS_BONUS_CAP_METERS = 80;

export function distanceMeters(
  from: GeolocationSample,
  to: Pick<LevelLocation, "lat" | "lng">,
): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Strict authored radius (operator/cockpit tools).
 * Player unlocks use {@link isWithinGeofenceForPlay}.
 */
export function isWithinGeofence(
  sample: GeolocationSample,
  target: LevelLocation,
): boolean {
  return distanceMeters(sample, target) <= target.radius_meters;
}

export function playGeofenceRadiusMeters(
  target: LevelLocation,
  sampleAccuracy?: number | null,
): number {
  const base = Math.max(target.radius_meters, PLAY_MIN_RADIUS_METERS);
  const accuracy = typeof sampleAccuracy === "number" && sampleAccuracy > 0 ? sampleAccuracy : 0;
  const padding = Math.min(
    accuracy * PLAY_ACCURACY_PADDING_FACTOR,
    PLAY_ACCURACY_PADDING_CAP_METERS,
  );
  return base + padding;
}

export function clampHealthRadiusBonus(meters: unknown): number {
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters <= 0) return 0;
  return Math.min(HEALTH_RADIUS_BONUS_CAP_METERS, Math.round(meters));
}

/** Authored location plus a health-engine bonus — same write path, wider check. */
export function withHealthRadiusBonus(
  target: LevelLocation,
  bonusMeters: unknown,
): LevelLocation {
  const bonus = clampHealthRadiusBonus(bonusMeters);
  if (bonus <= 0) return target;
  return { ...target, radius_meters: target.radius_meters + bonus };
}

/** Mass-outdoor player unlock — min radius + accuracy padding. */
export function isWithinGeofenceForPlay(
  sample: GeolocationSample,
  target: LevelLocation,
): boolean {
  return distanceMeters(sample, target) <= playGeofenceRadiusMeters(target, sample.accuracy);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Compass bearing in degrees (0 = north, clockwise). Map is north-up. */
export function bearingDegrees(
  from: Pick<GeolocationSample, "lat" | "lng">,
  to: Pick<LevelLocation, "lat" | "lng">,
): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
