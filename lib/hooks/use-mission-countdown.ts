"use client";

import { useEffect, useState } from "react";

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
): { remainingLabel: string; isExpired: boolean } {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    computeRemaining(startedAt, durationMinutes),
  );

  useEffect(() => {
    setRemainingSeconds(computeRemaining(startedAt, durationMinutes));
    const interval = window.setInterval(() => {
      setRemainingSeconds(computeRemaining(startedAt, durationMinutes));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt, durationMinutes]);

  return {
    remainingLabel: formatCountdown(remainingSeconds),
    isExpired: remainingSeconds <= 0,
  };
}

function computeRemaining(
  startedAt: string | null | undefined,
  durationMinutes: number,
): number {
  if (!startedAt) return durationMinutes * 60;
  const endMs = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
}
