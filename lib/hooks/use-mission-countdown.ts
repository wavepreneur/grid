"use client";

import { useEffect, useRef, useState } from "react";

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function useMissionCountdown(
  startedAt: string | null | undefined,
  durationMinutes: number,
  paused = false,
): { remainingLabel: string; isExpired: boolean } {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    computeRemaining(startedAt, durationMinutes, 0),
  );
  const pausedMsRef = useRef(0);
  const pauseStartedRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) {
      pauseStartedRef.current = Date.now();
      return;
    }
    if (pauseStartedRef.current != null) {
      pausedMsRef.current += Date.now() - pauseStartedRef.current;
      pauseStartedRef.current = null;
    }
  }, [paused]);

  useEffect(() => {
    const tick = () => {
      const extraPause =
        paused && pauseStartedRef.current != null
          ? Date.now() - pauseStartedRef.current
          : 0;
      setRemainingSeconds(
        computeRemaining(startedAt, durationMinutes, pausedMsRef.current + extraPause),
      );
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt, durationMinutes, paused]);

  return {
    remainingLabel: formatCountdown(remainingSeconds),
    isExpired: remainingSeconds <= 0 && !paused,
  };
}

function computeRemaining(
  startedAt: string | null | undefined,
  durationMinutes: number,
  pausedMs: number,
): number {
  if (!startedAt) return durationMinutes * 60;
  const endMs = new Date(startedAt).getTime() + durationMinutes * 60 * 1000 + pausedMs;
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
}
