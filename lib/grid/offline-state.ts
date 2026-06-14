import type { TeamRealtimeState } from "@/lib/grid/game-state";

const CACHE_PREFIX = "grid_team_state_";

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
