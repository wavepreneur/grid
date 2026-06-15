import { GRID_PLAYER_SESSION_KEY } from "@/lib/grid/constants";
import type { PlayerSession } from "@/lib/grid/types";

/** Team-scoped backup keyed by player_id for crash/refresh self-healing. */
function teamPlayerKey(teamId: string): string {
  return `${GRID_PLAYER_SESSION_KEY}:team:${teamId}`;
}

function teamCodesKey(inviteCode: string, joinCode: string): string {
  return `${GRID_PLAYER_SESSION_KEY}:codes:${inviteCode.toUpperCase()}:${joinCode.toUpperCase()}`;
}

type StoredPlayerRef = {
  playerId: string;
  displayName: string;
  inviteCode: string;
  joinCode: string;
  teamId: string;
};

function persistPlayerRef(ref: StoredPlayerRef): void {
  const payload = JSON.stringify(ref);
  localStorage.setItem(teamPlayerKey(ref.teamId), payload);
  localStorage.setItem(teamCodesKey(ref.inviteCode, ref.joinCode), payload);
}

export function persistPlayerSession(session: PlayerSession): void {
  localStorage.setItem(GRID_PLAYER_SESSION_KEY, JSON.stringify(session));
  persistPlayerRef({
    playerId: session.playerId,
    displayName: session.displayName,
    inviteCode: session.inviteCode,
    joinCode: session.joinCode,
    teamId: session.teamId,
  });
}

export function loadStoredPlayerIdForTeam(teamId: string): string | null {
  const raw = localStorage.getItem(teamPlayerKey(teamId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { playerId?: string };
    return parsed.playerId ?? null;
  } catch {
    return null;
  }
}

export function loadStoredPlayerIdForCodes(
  inviteCode: string,
  joinCode: string,
): string | null {
  const raw = localStorage.getItem(teamCodesKey(inviteCode, joinCode));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { playerId?: string };
    return parsed.playerId ?? null;
  } catch {
    return null;
  }
}

export function clearStoredTeamSession(teamId: string, inviteCode?: string, joinCode?: string): void {
  localStorage.removeItem(teamPlayerKey(teamId));
  if (inviteCode && joinCode) {
    localStorage.removeItem(teamCodesKey(inviteCode, joinCode));
  }
}
