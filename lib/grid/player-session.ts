"use client";

import { GRID_PLAYER_SESSION_KEY } from "@/lib/grid/constants";
import {
  clearStoredTeamSession,
  loadStoredPlayerIdForCodes,
  loadStoredPlayerIdForTeam,
  persistPlayerSession,
} from "@/lib/grid/session-storage";
import type { PlayerSession } from "@/lib/grid/types";

export {
  persistPlayerSession,
  loadStoredPlayerIdForTeam,
  loadStoredPlayerIdForCodes,
  clearStoredTeamSession,
} from "@/lib/grid/session-storage";

export function savePlayerSession(session: PlayerSession): void {
  persistPlayerSession(session);
}

export function loadPlayerSession(): PlayerSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(GRID_PLAYER_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

export function clearPlayerSession(): void {
  const session = loadPlayerSession();
  if (session?.teamId) {
    clearStoredTeamSession(session.teamId, session.inviteCode, session.joinCode);
  }
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

export function loadPlayerIdForTeam(
  inviteCode: string,
  joinCode: string,
  teamId?: string,
): string | null {
  const session = loadPlayerSessionForTeam(inviteCode, joinCode);
  if (session?.playerId) {
    return session.playerId;
  }

  const fromCodes = loadStoredPlayerIdForCodes(inviteCode, joinCode);
  if (fromCodes) return fromCodes;

  if (teamId) {
    return loadStoredPlayerIdForTeam(teamId);
  }

  return null;
}
