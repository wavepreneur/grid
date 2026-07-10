"use client";

import { useEffect, useState } from "react";
import {
  computeLevelScoringSnapshot,
  type LevelScoringSnapshot,
} from "@/lib/grid/level-scoring";
import type { LevelScoring } from "@/lib/grid/level-types";

export function useLevelScoringTimer(
  scoring: LevelScoring | undefined,
  startedAt: string | null | undefined,
  fallbackStartedAt?: string | null,
): LevelScoringSnapshot | null {
  const effectiveStart = startedAt ?? fallbackStartedAt ?? null;

  const [snapshot, setSnapshot] = useState<LevelScoringSnapshot | null>(() =>
    computeLevelScoringSnapshot(scoring, effectiveStart),
  );

  useEffect(() => {
    setSnapshot(computeLevelScoringSnapshot(scoring, effectiveStart));

    if (!scoring?.countdown_seconds || scoring.countdown_seconds <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setSnapshot(computeLevelScoringSnapshot(scoring, effectiveStart));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [scoring, effectiveStart]);

  return snapshot;
}
