import type { TeamRealtimeState } from "@/lib/grid/game-state";

const CACHE_PREFIX = "grid_team_state_";
const PAUSE_PREFIX = "grid:pause:";

export function cacheTeamState(state: TeamRealtimeState): void {
  localStorage.setItem(`${CACHE_PREFIX}${state.teamId}`, JSON.stringify(state));
}

export function loadCachedTeamState(teamId: string): TeamRealtimeState | null {
  const raw = localStorage.getItem(`${CACHE_PREFIX}${teamId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as TeamRealtimeState;
  } catch {
    return null;
  }
}

export function clearCachedTeamState(teamId: string): void {
  localStorage.removeItem(`${CACHE_PREFIX}${teamId}`);
}

/** Device-local pause — survives app close / URL reopen on this phone. */
export function pauseStorageKey(input: {
  inviteCode: string;
  joinCode: string;
  playerId: string;
}): string {
  return `${PAUSE_PREFIX}${input.inviteCode}:${input.joinCode}:${input.playerId}`;
}

export function readLocalPaused(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeLocalPaused(key: string, paused: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (paused) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
}
