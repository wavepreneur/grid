"use client";

const WINDOW_MS = 20_000;

function storageKey(inviteCode: string, joinCode: string): string {
  return `grid:mission-starting:${inviteCode.toUpperCase()}:${joinCode.toUpperCase()}`;
}

/** Mark that this device (and teammates via broadcast) are leaving the lobby now. */
export function markMissionStarting(inviteCode: string, joinCode: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(storageKey(inviteCode, joinCode), String(Date.now()));
}

export function isMissionStarting(inviteCode: string, joinCode: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = sessionStorage.getItem(storageKey(inviteCode, joinCode));
  const startedAt = Number(raw ?? 0);
  return startedAt > 0 && Date.now() - startedAt < WINDOW_MS;
}

export function clearMissionStarting(inviteCode: string, joinCode: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKey(inviteCode, joinCode));
}
