import type { LevelScoring } from "@/lib/grid/level-types";

export type LevelScoringSnapshot = {
  maxPoints: number;
  currentPoints: number;
  floorPoints: number;
  elapsedSeconds: number;
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

  const startMs = startedAt ? Date.parse(startedAt) : nowMs;
  const elapsedSeconds = Number.isNaN(startMs)
    ? 0
    : Math.max(0, Math.floor((nowMs - startMs) / 1000));

  let remainingSeconds: number | null = null;
  let isExpired = false;

  if (hasCountdown && countdownTotal) {
    remainingSeconds = Math.max(0, countdownTotal - elapsedSeconds);
    isExpired = remainingSeconds <= 0;
  }

  let currentPoints = maxPoints;

  if (hasDecay && countdownTotal) {
    const progress = Math.min(1, elapsedSeconds / countdownTotal);
    currentPoints = Math.round(maxPoints + (floorPoints - maxPoints) * progress);
    if (maxPoints >= floorPoints) {
      currentPoints = Math.max(floorPoints, Math.min(maxPoints, currentPoints));
    } else {
      currentPoints = Math.min(floorPoints, Math.max(maxPoints, currentPoints));
    }
  } else if (isExpired && hasCountdown && !hasDecay) {
    currentPoints = maxPoints;
  }

  return {
    maxPoints,
    currentPoints,
    floorPoints,
    elapsedSeconds,
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

export function hasLiveLevelScoring(scoring: LevelScoring | undefined): boolean {
  if (!scoring) return false;
  if (scoring.countdown_seconds && scoring.countdown_seconds > 0) return true;
  return false;
}
