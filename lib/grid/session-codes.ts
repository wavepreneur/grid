export const SESSION_ACTIVE = "SESSION_ACTIVE" as const;
export const SESSION_INVALID = "SESSION_INVALID" as const;
export const SESSION_SUPERSEDED = "SESSION_SUPERSEDED" as const;

export type SessionErrorCode =
  | typeof SESSION_ACTIVE
  | typeof SESSION_INVALID
  | typeof SESSION_SUPERSEDED;
