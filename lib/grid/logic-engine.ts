import type { CompiledGameLogic, StudioLogicRule } from "@/lib/cms/logic-rules";
import type { TeamGameState, GameLevelStatus } from "@/lib/grid/game-state";
import { activateLevelEntry, createInitialGameState } from "@/lib/grid/game-state";

export type LogicEvent =
  | { type: "game_start" }
  | { type: "task_solved"; taskId: string; levelNumber: number }
  | { type: "points_changed"; score: number }
  | { type: "elapsed_minutes"; minutes: number };

function levelKey(levelNumber: number): string {
  return String(levelNumber);
}

function setLevelStatus(
  levels: TeamGameState["levels"],
  levelNumber: number,
  status: GameLevelStatus,
): TeamGameState["levels"] {
  const key = levelKey(levelNumber);
  const prev = levels[key] ?? { status: "locked" as const };
  if (prev.status === "completed") return levels;
  const next = { ...prev, status };
  if (status === "active" && !next.started_at) {
    next.started_at = new Date().toISOString();
  }
  return {
    ...levels,
    [key]: next,
  };
}

function taskIdForLevel(compiled: CompiledGameLogic, levelNumber: number): string | null {
  return compiled.task_id_by_level[levelNumber] ?? null;
}

function levelForTaskId(compiled: CompiledGameLogic, taskId: string): number | null {
  return compiled.level_by_task_id[taskId] ?? null;
}

function ruleMatchesWhen(
  rule: StudioLogicRule,
  event: LogicEvent,
  compiled: CompiledGameLogic,
): boolean {
  const when = rule.when;
  switch (when.type) {
    case "game_start":
      if (event.type === "game_start") return true;
      if (
        event.type === "elapsed_minutes" &&
        rule.then.delay_minutes != null &&
        event.minutes >= rule.then.delay_minutes
      ) {
        return true;
      }
      return false;
    case "task_solved":
      return (
        event.type === "task_solved" &&
        Boolean(when.source_task_id) &&
        event.taskId === when.source_task_id
      );
    case "team_points_at_least":
      return event.type === "points_changed" && (when.points ?? 0) <= event.score;
    case "task_solved_any_team":
      return (
        event.type === "task_solved" &&
        Boolean(when.source_task_id) &&
        event.taskId === when.source_task_id
      );
    case "task_gps_reached":
      return false;
    default:
      return false;
  }
}

function applyRuleThen(
  levels: TeamGameState["levels"],
  rule: StudioLogicRule,
  compiled: CompiledGameLogic,
  event: LogicEvent,
): TeamGameState["levels"] {
  const targetTaskId = rule.then.target_task_id;
  if (!targetTaskId) {
    if (rule.then.type === "end_game") return levels;
    return levels;
  }

  const targetLevel = levelForTaskId(compiled, targetTaskId);
  if (!targetLevel) return levels;

  if (rule.then.delay_minutes && event.type === "game_start") {
    return levels;
  }
  if (
    rule.then.delay_minutes &&
    event.type === "elapsed_minutes" &&
    event.minutes < rule.then.delay_minutes
  ) {
    return levels;
  }

  switch (rule.then.type) {
    case "show_task":
    case "unlock_task":
      return setLevelStatus(levels, targetLevel, "active");
    case "hide_task":
      return setLevelStatus(levels, targetLevel, "locked");
    case "end_game":
      return levels;
    default:
      return levels;
  }
}

/** Apply compiled logic rules to level visibility/unlock state. */
export function applyGameLogic(
  gameState: TeamGameState,
  compiled: CompiledGameLogic,
  event: LogicEvent,
): TeamGameState {
  let levels = { ...gameState.levels };

  for (const rule of compiled.rules) {
    if (!rule.enabled) continue;
    if (!ruleMatchesWhen(rule, event, compiled)) continue;
    levels = applyRuleThen(levels, rule, compiled, event);
  }

  return { ...gameState, levels };
}

/** Build initial level map: all locked, then apply game_start rules. */
export function createInitialGameStateFromCompiled(
  compiled: CompiledGameLogic,
): TeamGameState {
  const totalLevels = compiled.levels.length;
  const base = createInitialGameState(totalLevels);

  const allLocked: TeamGameState["levels"] = {};
  for (let i = 1; i <= totalLevels; i += 1) {
    allLocked[levelKey(i)] = { status: "locked" };
  }

  let state: TeamGameState = { ...base, levels: allLocked };
  state = applyGameLogic(state, compiled, { type: "game_start" });

  const hasActive = Object.values(state.levels).some((entry) => entry.status === "active");
  if (!hasActive && totalLevels > 0) {
    state = {
      ...state,
      levels: activateLevelEntry(state.levels, "1"),
    };
  }

  return state;
}

/** After completing a level: apply task_solved + points triggers, pick next current level. */
export function resolveProgressionAfterSolve(input: {
  gameState: TeamGameState;
  compiled: CompiledGameLogic;
  completedLevel: number;
  score: number;
  elapsedMinutes?: number;
}): { gameState: TeamGameState; nextCurrentLevel: number; endGame: boolean } {
  const taskId = taskIdForLevel(input.compiled, input.completedLevel);
  let state = input.gameState;

  if (taskId) {
    state = applyGameLogic(state, input.compiled, {
      type: "task_solved",
      taskId,
      levelNumber: input.completedLevel,
    });
  }

  state = applyGameLogic(state, input.compiled, {
    type: "points_changed",
    score: input.score,
  });

  if (input.elapsedMinutes != null) {
    state = applyGameLogic(state, input.compiled, {
      type: "elapsed_minutes",
      minutes: input.elapsedMinutes,
    });
  }

  const endGame = taskId
    ? input.compiled.end_game_on_task_ids.includes(taskId)
    : false;

  const nextCurrentLevel = resolveNextCurrentLevel(state, input.completedLevel, input.compiled);

  return { gameState: state, nextCurrentLevel, endGame };
}

/** Lowest-numbered active level after current; fallback to linear +1. */
export function resolveNextCurrentLevel(
  gameState: TeamGameState,
  completedLevel: number,
  compiled: CompiledGameLogic,
): number {
  const total = compiled.levels.length;
  for (let level = 1; level <= total; level += 1) {
    if (level === completedLevel) continue;
    const entry = gameState.levels[levelKey(level)];
    if (entry?.status === "active") return level;
  }

  const linearNext = completedLevel + 1;
  if (linearNext <= total) {
    const entry = gameState.levels[levelKey(linearNext)];
    if (!entry || entry.status !== "completed") return linearNext;
  }

  for (let level = completedLevel + 1; level <= total; level += 1) {
    const entry = gameState.levels[levelKey(level)];
    if (entry?.status !== "completed") return level;
  }

  return completedLevel;
}

export function elapsedMinutesSince(startedAt: string | null): number | null {
  if (!startedAt) return null;
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return null;
  return Math.floor((Date.now() - start) / 60_000);
}
