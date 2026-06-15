import { EXITMANIA_TOTAL_LEVELS, DEFAULT_STARTING_SCORE } from "@/lib/grid/level-types";

/** @deprecated Use EXITMANIA_TOTAL_LEVELS */
export const PHASE2_DEMO_LEVELS = EXITMANIA_TOTAL_LEVELS;

export type GameLevelStatus = "locked" | "active" | "completed";

export type GameModalState = {
  id: string;
  type: "puzzle_solved";
  level: number;
  message: string;
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
  /** @deprecated Use purchased_tile_hints — kept for older saves. */
  hints_used: Record<string, number>;
  /** levelKey -> tileId -> revealed hint */
  purchased_tile_hints: Record<string, Record<string, PurchasedTileHint>>;
  modal: GameModalState | null;
  levels: Record<
    string,
    {
      status: GameLevelStatus;
      completed_at?: string;
      completed_by?: string[];
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
    };
  }

  return {
    version: 1,
    total_levels: totalLevels,
    score: DEFAULT_STARTING_SCORE,
    hints_used: {},
    purchased_tile_hints: {},
    modal: null,
    levels,
  };
}

export function parseTeamGameState(value: unknown): TeamGameState {
  if (!value || typeof value !== "object") {
    return createInitialGameState();
  }

  const candidate = value as Partial<TeamGameState>;
  return {
    version: candidate.version ?? 1,
    total_levels: candidate.total_levels ?? EXITMANIA_TOTAL_LEVELS,
    score: candidate.score ?? DEFAULT_STARTING_SCORE,
    hints_used: candidate.hints_used ?? {},
    purchased_tile_hints: candidate.purchased_tile_hints ?? {},
    modal: candidate.modal ?? null,
    levels: candidate.levels ?? createInitialGameState().levels,
  };
}

export function buildLevelCompletedModal(input: {
  level: number;
  solvedBy: string[];
}): GameModalState {
  return {
    id: crypto.randomUUID(),
    type: "puzzle_solved",
    level: input.level,
    message: "Rätsel gelöst!",
    solved_by: input.solvedBy,
    created_at: new Date().toISOString(),
  };
}
