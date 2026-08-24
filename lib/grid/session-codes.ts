export const SESSION_ACTIVE = "SESSION_ACTIVE" as const;
export const SESSION_INVALID = "SESSION_INVALID" as const;
export const SESSION_SUPERSEDED = "SESSION_SUPERSEDED" as const;
export const TEAM_FULL = "TEAM_FULL" as const;
export const PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND" as const;

export type SessionErrorCode =
  | typeof SESSION_ACTIVE
  | typeof SESSION_INVALID
  | typeof SESSION_SUPERSEDED
  | typeof TEAM_FULL
  | typeof PLAYER_NOT_FOUND;
