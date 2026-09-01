"use client";

const WINDOW_MS = 20_000;
const CREEP_MS = 3500;

function storageKey(inviteCode: string, joinCode: string): string {
  return `grid:mission-starting:${inviteCode.toUpperCase()}:${joinCode.toUpperCase()}`;
}

/** Mark that this device (and teammates via broadcast) are leaving the lobby now. */
export function markMissionStarting(inviteCode: string, joinCode: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(storageKey(inviteCode, joinCode), String(Date.now()));
}

export function missionStartBegunAt(inviteCode: string, joinCode: string): number | null {
  if (typeof window === "undefined") return null;
  const startedAt = Number(sessionStorage.getItem(storageKey(inviteCode, joinCode)) ?? 0);
  if (startedAt > 0 && Date.now() - startedAt < WINDOW_MS) return startedAt;
  return null;
}

/** Shared 0–100 fill so lobby overlay and play gate stay on the same bar. */
export function missionStartProgress(inviteCode: string, joinCode: string): number {
  const begun = missionStartBegunAt(inviteCode, joinCode);
  const elapsed = begun ? Date.now() - begun : 0;
  return Math.min(82, 8 + (elapsed / CREEP_MS) * 74);
}

export function isMissionStarting(inviteCode: string, joinCode: string): boolean {
  return missionStartBegunAt(inviteCode, joinCode) != null;
}

export function clearMissionStarting(inviteCode: string, joinCode: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKey(inviteCode, joinCode));
}
