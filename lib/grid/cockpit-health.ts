import { HEALTH_RADIUS_BONUS_CAP_METERS } from "@/lib/grid/geofence";

/**
 * Lead-device GPS health — radius fallback when the geofence hangs.
 * Pure helpers; the play write path is unchanged.
 */

export const HEALTH_NEAR_STUCK_MS = 90_000;
export const HEALTH_EXPAND_STEP_MS = 30_000;
export const HEALTH_EXPAND_STEP_METERS = 20;
export const HEALTH_NEAR_DISTANCE_FACTOR = 3;

export function computeHealthRadiusBonus(input: {
  authoredWithinRadius: boolean;
  nearStuckMs: number | null;
}): number {
  if (input.authoredWithinRadius) return 0;
  if (input.nearStuckMs === null || input.nearStuckMs < HEALTH_NEAR_STUCK_MS) return 0;
  const extra = input.nearStuckMs - HEALTH_NEAR_STUCK_MS;
  const steps = 1 + Math.floor(extra / HEALTH_EXPAND_STEP_MS);
  return Math.min(HEALTH_RADIUS_BONUS_CAP_METERS, steps * HEALTH_EXPAND_STEP_METERS);
}

export function isNearButOutsideGeofence(input: {
  distanceMeters: number | null;
  playRadiusMeters: number;
  authoredWithinRadius: boolean;
}): boolean {
  if (input.authoredWithinRadius) return false;
  if (input.distanceMeters === null) return false;
  return input.distanceMeters < input.playRadiusMeters * HEALTH_NEAR_DISTANCE_FACTOR;
}
