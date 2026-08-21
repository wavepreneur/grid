import { EXITMANIA_TOTAL_LEVELS, DEFAULT_STARTING_SCORE } from "@/lib/grid/level-types";
import type { PlayPhase } from "@/lib/grid/play-surface";

/** @deprecated Use EXITMANIA_TOTAL_LEVELS */
export const PHASE2_DEMO_LEVELS = EXITMANIA_TOTAL_LEVELS;

export type GameLevelStatus = "locked" | "active" | "completed";

export type GameModalState = {
  id: string;
  type: "puzzle_solved";
  level: number;
  /** Headline on the success card (e.g. „Notiert euch das“). */
  message: string;
  /** Body copy the team should note — required for the modal to appear. */
  body?: string;
  points_earned?: number;
  solved_by: string[];
  created_at: string;
};

export type PurchasedTileHint = {
  text: string;
  cost: number;
};

export type TeamGameState = {
  version: number;
  total_levels: number;
  score: number;
  /**
   * Player phase within the active slot: hub → quiz → level → bonus.
   * Older saves omit this; UI treats missing as "level" (legacy single screen).
   */
  current_phase?: PlayPhase;
  /** After bonus: level index to open next (set when entering bonus phase). */
  pending_next_level?: number | null;
  /** @deprecated Use purchased_tile_hints — kept for older saves. */
  hints_used: Record<string, number>;
  /** levelKey -> tileId -> revealed hint */
  purchased_tile_hints: Record<string, Record<string, PurchasedTileHint>>;
  /** levelKey -> hintId -> purchased task hint */
  purchased_level_hints: Record<string, Record<string, PurchasedTileHint>>;
  modal: GameModalState | null;
  levels: Record<
    string,
    {
      status: GameLevelStatus;
      started_at?: string;
      completed_at?: string;
      completed_by?: string[];
      /** Furthest phase reached in this slot (optional). */
      phase?: PlayPhase;
    }
  >;
};

export type TeamSyncEventType =
  | "game_started"
  | "level_completed"
  | "modal_cleared"
  | "game_finished";

export type TeamSyncEvent = {
  id: string;
  team_id: string;
  sequence: number;
  event_type: TeamSyncEventType;
  level: number | null;
  payload: Record<string, unknown>;
  actor_player_id: string | null;
  created_at: string;
};

export type TeamRealtimeState = {
  teamId: string;
  status: string;
  currentLevel: number;
  gameState: TeamGameState;
  startedAt: string | null;
  lobbyAutoStartAt: string | null;
  isCaptain?: boolean;
  isNavigator?: boolean;
};

export function createInitialGameState(
  totalLevels = EXITMANIA_TOTAL_LEVELS,
): TeamGameState {
  const levels: TeamGameState["levels"] = {};

  for (let level = 1; level <= totalLevels; level += 1) {
    levels[String(level)] = {
      status: level === 1 ? "active" : "locked",
      ...(level === 1 ? { started_at: new Date().toISOString() } : {}),
    };
  }

  return {
    version: 1,
    total_levels: totalLevels,
    score: DEFAULT_STARTING_SCORE,
    current_phase: "hub",
    hints_used: {},
    purchased_tile_hints: {},
    purchased_level_hints: {},
    modal: null,
    levels,
  };
}

export function parseTeamGameState(value: unknown): TeamGameState {
  if (!value || typeof value !== "object") {
    return createInitialGameState();
  }

  const candidate = value as Partial<TeamGameState>;
  const phase =
    candidate.current_phase === "hub" ||
    candidate.current_phase === "quiz" ||
    candidate.current_phase === "level" ||
    candidate.current_phase === "bonus"
      ? candidate.current_phase
      : undefined;

  return {
    version: candidate.version ?? 1,
    total_levels: candidate.total_levels ?? EXITMANIA_TOTAL_LEVELS,
    score: candidate.score ?? DEFAULT_STARTING_SCORE,
    current_phase: phase,
    pending_next_level:
      typeof candidate.pending_next_level === "number" || candidate.pending_next_level === null
        ? candidate.pending_next_level
        : undefined,
    hints_used: candidate.hints_used ?? {},
    purchased_tile_hints: candidate.purchased_tile_hints ?? {},
    purchased_level_hints: candidate.purchased_level_hints ?? {},
    modal: candidate.modal ?? null,
    levels: candidate.levels ?? createInitialGameState().levels,
  };
}

export function activateLevelEntry(
  levels: TeamGameState["levels"],
  levelKey: string,
): TeamGameState["levels"] {
  const entry = levels[levelKey];
  if (!entry) return levels;
  const now = new Date().toISOString();
  return {
    ...levels,
    [levelKey]: {
      ...entry,
      status: "active",
      started_at: entry.started_at ?? now,
    },
  };
}

export function buildLevelCompletedModal(input: {
  level: number;
  solvedBy: string[];
  pointsEarned?: number;
  successTitle?: string | null;
  successInfo?: string | null;
}): GameModalState | null {
  const body = input.successInfo?.trim();
  if (!body) return null;

  const title = input.successTitle?.trim() || "Notiert euch das";

  return {
    id: crypto.randomUUID(),
    type: "puzzle_solved",
    level: input.level,
    message: title,
    body,
    points_earned: input.pointsEarned,
    solved_by: input.solvedBy,
    created_at: new Date().toISOString(),
  };
}
