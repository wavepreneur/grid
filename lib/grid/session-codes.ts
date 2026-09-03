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

export function isSessionSupersededResult(result: {
  success: boolean;
  error?: string;
  code?: string;
}): boolean {
  if (result.success) return false;
  if (result.code === SESSION_SUPERSEDED) return true;
  return /Session ungültig|Session ist abgelaufen|Session abgelaufen|anderen Gerät/i.test(
    result.error ?? "",
  );
}
