"use client";

import { GRID_PLAYER_SESSION_KEY } from "@/lib/grid/constants";
import type { PlayerSession } from "@/lib/grid/types";

export function savePlayerSession(session: PlayerSession): void {
  localStorage.setItem(GRID_PLAYER_SESSION_KEY, JSON.stringify(session));
}

export function loadPlayerSession(): PlayerSession | null {
  const raw = localStorage.getItem(GRID_PLAYER_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

export function clearPlayerSession(): void {
  localStorage.removeItem(GRID_PLAYER_SESSION_KEY);
}

export function loadPlayerSessionForTeam(
  inviteCode: string,
  joinCode: string,
): PlayerSession | null {
  const session = loadPlayerSession();
  if (!session) return null;

  if (
    session.inviteCode !== inviteCode.toUpperCase() ||
    session.joinCode !== joinCode.toUpperCase()
  ) {
    return null;
  }

  return session;
}
