import type { GridTeamStatus } from "@/lib/grid/types";

function code(value: string): string {
  return value.toUpperCase();
}

/** Canonical player entry for an event (Kahoot-style landing). */
export function eventPath(inviteCode: string): string {
  return `/e/${code(inviteCode)}`;
}

export function eventCaptainPath(inviteCode: string, prebookedJoinCode?: string): string {
  const base = `/e/${code(inviteCode)}/captain`;
  if (!prebookedJoinCode) return base;
  return `${base}?team=${code(prebookedJoinCode)}`;
}

export function eventTeamJoinPath(inviteCode: string, joinCode: string): string {
  return `/e/${code(inviteCode)}/team/${code(joinCode)}`;
}

export function eventLobbyPath(
  inviteCode: string,
  joinCode: string,
  options?: { manage?: boolean },
): string {
  const base = `/e/${code(inviteCode)}/lobby/${code(joinCode)}`;
  if (options?.manage) return `${base}?manage=1`;
  return base;
}

export function eventPlayPath(inviteCode: string, joinCode: string): string {
  return `/e/${code(inviteCode)}/play/${code(joinCode)}`;
}

export function cockpitPath(inviteCode: string): string {
  return `/cockpit/${code(inviteCode)}`;
}

export function cockpitShowPath(inviteCode: string): string {
  return `/cockpit/${code(inviteCode)}/show`;
}

export function teamEntryPath(
  inviteCode: string,
  joinCode: string,
  teamStatus: GridTeamStatus,
): string {
  if (teamStatus === "playing" || teamStatus === "finished") {
    return eventPlayPath(inviteCode, joinCode);
  }
  return eventLobbyPath(inviteCode, joinCode);
}

/** Legacy redirects — keep old bookmarks working. */
export function legacyJoinPath(inviteCode: string): string {
  return `/join/${code(inviteCode)}`;
}
