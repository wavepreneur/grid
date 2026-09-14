"use client";

import { useEffect, useRef, useState } from "react";
import {
  computeLevelScoringSnapshot,
  earliestIsoTimestamp,
  type LevelScoringSnapshot,
} from "@/lib/grid/level-scoring";
import type { LevelScoring } from "@/lib/grid/level-types";

export function useLevelScoringTimer(
  scoring: LevelScoring | undefined,
  startedAt: string | null | undefined,
  fallbackStartedAt?: string | null,
): LevelScoringSnapshot | null {
  const countdownSeconds = scoring?.countdown_seconds ?? 0;

  const pinnedStartRef = useRef<string | null>(null);
  const incoming = startedAt ?? fallbackStartedAt ?? null;
  if (incoming) {
    pinnedStartRef.current = earliestIsoTimestamp(pinnedStartRef.current, incoming);
  }
  const effectiveStart = pinnedStartRef.current ?? incoming;

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (countdownSeconds <= 0) return undefined;
    setNowMs(Date.now());
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [countdownSeconds]);

  return computeLevelScoringSnapshot(scoring, effectiveStart, nowMs);
}
