import type { LevelScoring } from "@/lib/grid/level-types";

export type LevelScoringSnapshot = {
  maxPoints: number;
  currentPoints: number;
  floorPoints: number;
  elapsedSeconds: number;
  /** 0–1 progress through the countdown window (sub-second). */
  elapsedRatio: number;
  remainingSeconds: number | null;
  isExpired: boolean;
  hasCountdown: boolean;
  hasDecay: boolean;
};

export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/** Live points + countdown for an active level (server & client). */
export function computeLevelScoringSnapshot(
  scoring: LevelScoring | undefined,
  startedAt: string | null | undefined,
  nowMs = Date.now(),
): LevelScoringSnapshot | null {
  if (!scoring) return null;

  const maxPoints = scoring.points;
  const floorPoints = scoring.decay_floor ?? 0;
  const countdownTotal = scoring.countdown_seconds ?? null;
  const hasCountdown = Boolean(countdownTotal && countdownTotal > 0);
  const hasDecay = Boolean(scoring.decay_enabled && hasCountdown);

  const startMs = startedAt ? Date.parse(startedAt) : Number.NaN;
  const elapsedMs = Number.isNaN(startMs) ? 0 : Math.max(0, nowMs - startMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const elapsedRatio =
    hasCountdown && countdownTotal
      ? Math.min(1, elapsedMs / (countdownTotal * 1000))
      : 0;

  let remainingSeconds: number | null = null;
  let isExpired = false;

  if (hasCountdown && countdownTotal) {
    const remainingMs = countdownTotal * 1000 - elapsedMs;
    remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    isExpired = remainingMs <= 0;
  }

  let currentPoints = maxPoints;

  if (hasDecay && countdownTotal) {
    currentPoints = Math.round(maxPoints + (floorPoints - maxPoints) * elapsedRatio);
    if (maxPoints >= floorPoints) {
      currentPoints = Math.max(floorPoints, Math.min(maxPoints, currentPoints));
    } else {
      currentPoints = Math.min(floorPoints, Math.max(maxPoints, currentPoints));
    }
    if (isExpired) currentPoints = floorPoints;
  } else if (isExpired && hasCountdown && !hasDecay) {
    currentPoints = maxPoints;
  }

  return {
    maxPoints,
    currentPoints,
    floorPoints,
    elapsedSeconds,
    elapsedRatio,
    remainingSeconds,
    isExpired,
    hasCountdown,
    hasDecay,
  };
}

/** Points applied to team score when the level is solved. */
export function computeLevelReward(
  scoring: LevelScoring | undefined,
  startedAt: string | null | undefined,
  nowMs = Date.now(),
): number {
  const snapshot = computeLevelScoringSnapshot(scoring, startedAt, nowMs);
  return snapshot?.currentPoints ?? 0;
}

export function earliestIsoTimestamp(
  ...values: Array<string | null | undefined>
): string | null {
  const times = values.filter((value): value is string => {
    if (!value) return false;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed);
  });
  if (times.length === 0) return null;
  return times.reduce((left, right) =>
    Date.parse(left) <= Date.parse(right) ? left : right,
  );
}

export function hasLiveLevelScoring(scoring: LevelScoring | undefined): boolean {
  if (!scoring) return false;
  if (scoring.countdown_seconds && scoring.countdown_seconds > 0) return true;
  return false;
}

export function parseLevelScoring(value: unknown): LevelScoring | undefined {
  if (!value || typeof value !== "object") return undefined;
  const scoring = value as Partial<LevelScoring>;
  if (typeof scoring.points !== "number" || !Number.isFinite(scoring.points)) {
    return undefined;
  }
  return {
    points: Math.round(scoring.points),
    countdown_seconds:
      typeof scoring.countdown_seconds === "number" && scoring.countdown_seconds > 0
        ? Math.round(scoring.countdown_seconds)
        : scoring.countdown_seconds === null
          ? null
          : undefined,
    decay_enabled: Boolean(scoring.decay_enabled),
    decay_floor:
      typeof scoring.decay_floor === "number" ? Math.round(scoring.decay_floor) : undefined,
    allow_reveal_solution: Boolean(scoring.allow_reveal_solution),
  };
}
