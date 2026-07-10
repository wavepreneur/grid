import { createAdminClient } from "@/lib/supabase/admin";
import { parseLevelDefinitions } from "@/lib/grid/content-engine";
import type { LevelDefinition } from "@/lib/grid/level-types";
import type { CompiledGameLogic } from "@/lib/cms/logic-rules";
import { parseLogicRules, orderLinksForCompile } from "@/lib/cms/logic-rules";
import type { StudioGame, StudioGameTaskLink } from "@/lib/cms/types";

export type StudioVersionSnapshot = {
  game: StudioGame;
  levels: LevelDefinition[];
  compiledLogic: CompiledGameLogic | null;
};

export function extractCompiledLogicFromSnapshot(snapshot: unknown): CompiledGameLogic | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const raw = snapshot as Record<string, unknown>;
  const compiled = raw.compiled_logic as Partial<CompiledGameLogic> | undefined;
  if (!compiled?.levels?.length) return null;

  const levels = parseLevelDefinitions(compiled.levels);
  if (levels.length === 0) return null;

  const task_id_by_level: Record<number, string> = { ...(compiled.task_id_by_level ?? {}) };
  const level_by_task_id: Record<string, number> = { ...(compiled.level_by_task_id ?? {}) };

  if (Object.keys(task_id_by_level).length === 0) {
    const tasks = raw.tasks as StudioGameTaskLink[] | undefined;
    if (Array.isArray(tasks) && tasks.length > 0) {
      const ordered = orderLinksForCompile(tasks);
      ordered.forEach((link, index) => {
        const n = index + 1;
        task_id_by_level[n] = link.task_id;
        level_by_task_id[link.task_id] = n;
      });
    }
  }

  return {
    rules: parseLogicRules(compiled.rules ?? raw.logic_rules),
    levels,
    task_id_by_level,
    level_by_task_id,
    end_game_on_task_ids: compiled.end_game_on_task_ids ?? [],
    hide_on_any_solve_task_ids: compiled.hide_on_any_solve_task_ids ?? [],
    points_gates: compiled.points_gates ?? [],
  };
}

export function extractLevelsFromSnapshot(snapshot: unknown): LevelDefinition[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const raw = snapshot as Record<string, unknown>;
  const compiled = raw.compiled_logic as { levels?: unknown } | undefined;
  const levels = compiled?.levels ?? raw.levels;
  return parseLevelDefinitions(levels);
}

export async function loadStudioVersionSnapshot(
  versionId: string,
): Promise<StudioVersionSnapshot | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("studio_game_versions")
    .select("snapshot")
    .eq("id", versionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.snapshot || typeof data.snapshot !== "object") return null;

  const snapshot = data.snapshot as Record<string, unknown>;
  const game = snapshot.game as StudioGame | undefined;
  if (!game?.id) return null;

  const levels = extractLevelsFromSnapshot(snapshot);
  const compiledLogic = extractCompiledLogicFromSnapshot(snapshot);
  return { game, levels, compiledLogic };
}
