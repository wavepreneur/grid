import { EXITMANIA_TOTAL_LEVELS, DEFAULT_STARTING_SCORE } from "@/lib/grid/level-types";
import {
  parseOutdoorProgress,
  type OutdoorProgressState,
} from "@/lib/grid/outdoor-unlock";
import type { PlayPhase } from "@/lib/grid/play-surface";
import { parseBonusTask } from "@/lib/grid/bonus";

/** @deprecated Use EXITMANIA_TOTAL_LEVELS */
export const PHASE2_DEMO_LEVELS = EXITMANIA_TOTAL_LEVELS;

export type GameLevelStatus = "locked" | "active" | "completed";

export type GameModalState = {
  id: string;
  type: "puzzle_solved";
  level: number;
  /** Headline on the success card (e.g. „Notiert euch das“). */
  message: string;
  /** Body copy the team should note — optional. */
  body?: string;
  points_earned?: number;
  solved_by: string[];
  created_at: string;
};

/** Shared Schlüssel-Quiz reveal — every device shows the same answerer + result. */
export type QuizRevealState = {
  answered_by: string;
  answered_by_player_id: string;
  correct: boolean;
  selected_option_ids: string[];
  points_earned: number;
  revealed_at: string;
};

/**
 * Role-only bonus that runs while the rest of the team continues on the hub.
 * Team-wide bonuses still use current_phase === "bonus".
 */
export type ActiveBonusState = {
  from_level: number;
  for_role: "alpha" | "beta" | "gamma";
  for_team: boolean;
  started_at: string;
  /** Compiled bonus id when from bonuses[]. */
  bonus_id?: string;
};

/** Armed / ready Layer-3 surprises. @see docs/BONUS_LAYER3_MODEL.md */
export type BonusQueueItem = {
  bonus_id: string;
  from_level: number;
  for_role: "alpha" | "beta" | "gamma";
  for_team: boolean;
  armed_at: string;
  ready_at: string | null;
  status: "armed" | "ready" | "active" | "done" | "skipped";
  meters_required?: number;
  /** When set, completing this bonus re-arms another after N minutes. */
  interval_minutes?: number;
  fanfare_shown?: boolean;
  /**
   * Content snapshot at arm time — UI must not depend on a fresh client content load
   * (Studio test edits / unpublished publish snapshots).
   */
  task_snapshot?: import("@/lib/grid/level-types").BonusTask;
};

/** Short team broadcast after a bonus is finished. */
export type BonusNoticeState = {
  id: string;
  by: string;
  correct: boolean;
  reward: number;
  created_at: string;
};

export type PurchasedTileHint = {
  text: string;
  cost: number;
  /** Display name of the teammate who unlocked this tip. */
  unlocked_by?: string;
  unlocked_by_player_id?: string;
  unlocked_at?: string;
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
  /** Team-wide entry-quiz reveal while still in phase "quiz". */
  quiz_reveal?: QuizRevealState | null;
  /** Asymmetric bonus overlay while team is already on the next hub. */
  active_bonus?: ActiveBonusState | null;
  /** Layer-3 surprise queue (armed / ready / done). */
  bonus_queue?: BonusQueueItem[];
  /** Ephemeral toast payload after bonus completes. */
  bonus_notice?: BonusNoticeState | null;
  /**
   * Server-held outdoor walk progress (mission meters + bonus meters).
   * Alpha device reports; all devices read via realtime.
   */
  outdoor_progress?: OutdoorProgressState | null;
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
    quiz_reveal: null,
    active_bonus: null,
    bonus_queue: [],
    bonus_notice: null,
    outdoor_progress: null,
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
    quiz_reveal: parseQuizReveal(candidate.quiz_reveal),
    active_bonus: parseActiveBonus(candidate.active_bonus),
    bonus_queue: parseBonusQueue(candidate.bonus_queue),
    bonus_notice: parseBonusNotice(candidate.bonus_notice),
    outdoor_progress:
      candidate.outdoor_progress === null
        ? null
        : parseOutdoorProgress(candidate.outdoor_progress) ?? undefined,
    hints_used: candidate.hints_used ?? {},
    purchased_tile_hints: candidate.purchased_tile_hints ?? {},
    purchased_level_hints: candidate.purchased_level_hints ?? {},
    modal: candidate.modal ?? null,
    levels: candidate.levels ?? createInitialGameState().levels,
  };
}

function parseQuizReveal(value: unknown): QuizRevealState | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const c = value as Partial<QuizRevealState>;
  if (!c.answered_by || !c.answered_by_player_id || !c.revealed_at) return null;
  return {
    answered_by: String(c.answered_by),
    answered_by_player_id: String(c.answered_by_player_id),
    correct: Boolean(c.correct),
    selected_option_ids: Array.isArray(c.selected_option_ids)
      ? c.selected_option_ids.map(String)
      : [],
    points_earned: Math.max(0, Math.round(Number(c.points_earned) || 0)),
    revealed_at: String(c.revealed_at),
  };
}

function parseActiveBonus(value: unknown): ActiveBonusState | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const c = value as Partial<ActiveBonusState>;
  if (
    typeof c.from_level !== "number" ||
    (c.for_role !== "alpha" && c.for_role !== "beta" && c.for_role !== "gamma") ||
    !c.started_at
  ) {
    return null;
  }
  return {
    from_level: c.from_level,
    for_role: c.for_role,
    for_team: Boolean(c.for_team),
    started_at: String(c.started_at),
    bonus_id: typeof c.bonus_id === "string" ? c.bonus_id : undefined,
  };
}

function parseBonusQueue(value: unknown): BonusQueueItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items: BonusQueueItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Partial<BonusQueueItem>;
    if (typeof c.bonus_id !== "string" || typeof c.from_level !== "number") continue;
    if (c.for_role !== "alpha" && c.for_role !== "beta" && c.for_role !== "gamma") continue;
    if (
      c.status !== "armed" &&
      c.status !== "ready" &&
      c.status !== "active" &&
      c.status !== "done" &&
      c.status !== "skipped"
    ) {
      continue;
    }
    items.push({
      bonus_id: c.bonus_id,
      from_level: c.from_level,
      for_role: c.for_role,
      for_team: Boolean(c.for_team),
      armed_at: String(c.armed_at ?? ""),
      ready_at: c.ready_at == null ? null : String(c.ready_at),
      status: c.status,
      meters_required:
        typeof c.meters_required === "number" ? c.meters_required : undefined,
      interval_minutes:
        typeof c.interval_minutes === "number" && c.interval_minutes > 0
          ? c.interval_minutes
          : undefined,
      fanfare_shown: Boolean(c.fanfare_shown),
      task_snapshot: parseBonusTask(c.task_snapshot) ?? undefined,
    });
  }
  return items;
}

function parseBonusNotice(value: unknown): BonusNoticeState | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const c = value as Partial<BonusNoticeState>;
  if (!c.id || !c.by || !c.created_at) return null;
  return {
    id: String(c.id),
    by: String(c.by),
    correct: Boolean(c.correct),
    reward: Math.max(0, Math.round(Number(c.reward) || 0)),
    created_at: String(c.created_at),
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
}): GameModalState {
  const body = input.successInfo?.trim() || undefined;
  const title = body
    ? input.successTitle?.trim() || "Notiert euch das"
    : "Aufgabe geschafft";

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
