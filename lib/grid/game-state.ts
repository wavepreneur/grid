/** Phase 2 demo uses 3 levels. Phase 3 expands to 10 with content layer. */
export const PHASE2_DEMO_LEVELS = 3;

export type GameLevelStatus = "locked" | "active" | "completed";

export type GameModalState = {
  id: string;
  type: "puzzle_solved";
  level: number;
  message: string;
  solved_by: string[];
  created_at: string;
};

export type TeamGameState = {
  version: number;
  total_levels: number;
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
};

export function createInitialGameState(
  totalLevels = PHASE2_DEMO_LEVELS,
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
    total_levels: candidate.total_levels ?? PHASE2_DEMO_LEVELS,
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
