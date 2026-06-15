/** Client-side player credential (Zero-Auth). Never Supabase Auth. */
export const GRID_PLAYER_SESSION_KEY = "grid_player_session";

/** Phase 1 lobby polling interval until Phase 2 Realtime policies exist. */
export const LOBBY_POLL_INTERVAL_MS = 2000;

export const DEFAULT_LOBBY_AUTO_START_SECONDS = 180;

/**
 * Phase 4 analytics stream table.
 */
export const ANALYTICS_TABLE = "audit_logs" as const;

export const DEPARTMENT_OPTIONS = [
  "Engineering",
  "Product",
  "Sales",
  "Marketing",
  "HR",
  "Finance",
  "Operations",
  "Leadership",
  "Other",
] as const;

export const REGION_OPTIONS = [
  "DACH",
  "Europe",
  "North America",
  "APAC",
  "LATAM",
  "Middle East & Africa",
  "Global / Remote",
] as const;
