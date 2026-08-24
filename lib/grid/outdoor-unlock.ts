/**
 * Outdoor unlock helpers for migrating games:
 * - Geofence (fixed lat/lng waypoints)
 * - Distance (every N meters a task opens)
 *
 * Design goal: teams finish without support hell — generous tolerance,
 * Alpha lead overrides with audit, server-held progress.
 */

import type { GeolocationSample, LevelDefinition, LevelLocation } from "@/lib/grid/level-types";
import { distanceMeters, playGeofenceRadiusMeters } from "@/lib/grid/geofence";

/** Floor for authored radius — phones drift; 15 m is often too tight outdoors. */
export const MIN_GEOFENCE_RADIUS_METERS = 25;

/** Soft slack when comparing walked meters vs after_meters. */
export const DISTANCE_UNLOCK_TOLERANCE_METERS = 2;

/**
 * Reject absurd client jumps in one report (anti-teleport soft limit).
 * Legitimate walking rarely exceeds this between sync ticks.
 */
export const DISTANCE_REPORT_MAX_JUMP_METERS = 250;

export type OutdoorUnlockMode = "geofence" | "distance" | "time" | "none";

export type OutdoorForceUnlock = "geofence" | "distance";

export type OutdoorProgressState = {
  level: number;
  walked_meters: number;
  updated_at: string;
  tracker_player_id?: string;
  /** Shared walk after mission solve for Layer-3 delay_meters. */
  bonus_walked_meters?: number;
};

export function resolveOutdoorUnlockMode(
  level: Pick<LevelDefinition, "location" | "triggers">,
): OutdoorUnlockMode {
  const triggers = level.triggers;
  if (
    triggers?.type === "distance" &&
    typeof triggers.after_meters === "number" &&
    triggers.after_meters > 0
  ) {
    return "distance";
  }
  if (
    triggers?.type === "time" &&
    typeof triggers.after_minutes === "number" &&
    triggers.after_minutes > 0
  ) {
    return "time";
  }
  if (level.location) return "geofence";
  return "none";
}

export function effectiveGeofenceRadiusMeters(
  target: LevelLocation,
  sampleAccuracy?: number | null,
): number {
  return playGeofenceRadiusMeters(target, sampleAccuracy);
}

/** Player unlock check — generous vs authored pin radius. */
export function isWithinGeofenceRelaxed(
  sample: GeolocationSample,
  target: LevelLocation,
): boolean {
  return distanceMeters(sample, target) <= effectiveGeofenceRadiusMeters(target, sample.accuracy);
}

export function hasReachedDistanceMeters(
  walkedMeters: number,
  requiredMeters: number,
  tolerance = DISTANCE_UNLOCK_TOLERANCE_METERS,
): boolean {
  return walkedMeters + tolerance >= requiredMeters;
}

export function mergeWalkedMetersReport(input: {
  previous: number;
  reported: number;
  maxJump?: number;
}): number {
  const maxJump = input.maxJump ?? DISTANCE_REPORT_MAX_JUMP_METERS;
  const prev = Math.max(0, input.previous);
  const reported = Math.max(0, input.reported);
  if (reported <= prev) return prev;
  if (reported - prev > maxJump) {
    // Soft clamp: allow progress but not teleport past the jump cap in one sync.
    return prev + maxJump;
  }
  return reported;
}

export function upsertOutdoorLevelProgress(input: {
  existing: OutdoorProgressState | null | undefined;
  level: number;
  reportedMeters: number;
  playerId: string;
  nowIso: string;
}): OutdoorProgressState {
  const sameLevel = input.existing?.level === input.level;
  const previous = sameLevel ? (input.existing?.walked_meters ?? 0) : 0;
  const walked = mergeWalkedMetersReport({
    previous,
    reported: input.reportedMeters,
  });
  return {
    level: input.level,
    walked_meters: walked,
    updated_at: input.nowIso,
    tracker_player_id: input.playerId,
    bonus_walked_meters: sameLevel ? input.existing?.bonus_walked_meters : undefined,
  };
}

export function upsertOutdoorBonusMeters(input: {
  existing: OutdoorProgressState | null | undefined;
  reportedMeters: number;
  playerId: string;
  nowIso: string;
  /** Keep level context if present. */
  level?: number;
}): OutdoorProgressState {
  const previous = input.existing?.bonus_walked_meters ?? 0;
  const walked = mergeWalkedMetersReport({
    previous,
    reported: input.reportedMeters,
  });
  return {
    level: input.level ?? input.existing?.level ?? 0,
    walked_meters: input.existing?.walked_meters ?? 0,
    updated_at: input.nowIso,
    tracker_player_id: input.playerId,
    bonus_walked_meters: walked,
  };
}

export function parseOutdoorProgress(value: unknown): OutdoorProgressState | null {
  if (!value || typeof value !== "object") return null;
  const c = value as Partial<OutdoorProgressState>;
  if (typeof c.level !== "number" || typeof c.walked_meters !== "number") return null;
  return {
    level: c.level,
    walked_meters: Math.max(0, c.walked_meters),
    updated_at: typeof c.updated_at === "string" ? c.updated_at : new Date().toISOString(),
    tracker_player_id:
      typeof c.tracker_player_id === "string" ? c.tracker_player_id : undefined,
    bonus_walked_meters:
      typeof c.bonus_walked_meters === "number"
        ? Math.max(0, c.bonus_walked_meters)
        : undefined,
  };
}
