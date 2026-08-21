import { createAdminClient } from "@/lib/supabase/admin";
import { parseLinkLayer } from "@/lib/cms/game-link-config";
import {
  compileGameLogic,
  parseLogicRules,
} from "@/lib/cms/logic-rules";
import {
  parseActiveLayers,
  parseRuntimeProfiles,
} from "@/lib/cms/layer-model";
import { DEFAULT_TASK_CONTENT, type StudioGame, type StudioGameTaskLink, type StudioTask } from "@/lib/cms/types";
import type { StudioVersionSnapshot } from "@/lib/cms/studio-snapshot";

function normalizeGameRow(row: StudioGame): StudioGame {
  return {
    ...row,
    active_layers: parseActiveLayers(row.active_layers),
    runtime_profiles: parseRuntimeProfiles(row.runtime_profiles),
    logic_rules: row.logic_rules ?? [],
  };
}

function mapTaskRow(raw: Record<string, unknown>): StudioTask {
  return {
    ...(raw as StudioTask),
    content: { ...DEFAULT_TASK_CONTENT, ...((raw.content as StudioTask["content"]) ?? {}) },
    tags: (raw.tags as string[]) ?? [],
    layer: (raw.layer as StudioTask["layer"]) ?? 2,
    content_context: (raw.content_context as StudioTask["content_context"]) ?? "any",
    role_assignment: (raw.role_assignment as StudioTask["role_assignment"]) ?? "team",
  };
}

/**
 * Compile the current Studio editor state (not a frozen publish snapshot).
 * Used by Studio test sessions so „Testen“ always reflects saved changes.
 */
export async function loadLiveStudioGameSnapshot(
  gameId: string,
): Promise<StudioVersionSnapshot | null> {
  const supabase = createAdminClient();
  const { data: gameRow, error: gameError } = await supabase
    .from("studio_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) throw new Error(gameError.message);
  if (!gameRow) return null;

  const game = normalizeGameRow(gameRow as StudioGame);

  const { data: linkRows, error: linksError } = await supabase
    .from("studio_game_tasks")
    .select("id, game_id, task_id, layer, sort_order, overrides, studio_tasks(*)")
    .eq("game_id", gameId)
    .order("sort_order");

  if (linksError) throw new Error(linksError.message);

  const links: StudioGameTaskLink[] = (linkRows ?? []).flatMap((row) => {
    const r = row as {
      id: string;
      game_id: string;
      task_id: string;
      layer?: number;
      sort_order: number;
      overrides: Record<string, unknown>;
      studio_tasks: Record<string, unknown> | Record<string, unknown>[] | null;
    };
    const taskRaw = Array.isArray(r.studio_tasks) ? r.studio_tasks[0] : r.studio_tasks;
    if (!taskRaw) return [];
    const partial = {
      id: r.id,
      game_id: r.game_id,
      task_id: r.task_id,
      sort_order: r.sort_order,
      overrides: r.overrides ?? {},
      layer: (r.layer === 1 || r.layer === 2 || r.layer === 3 ? r.layer : 2) as 1 | 2 | 3,
      task: mapTaskRow(taskRaw),
    };
    return [{ ...partial, layer: parseLinkLayer(partial) }];
  });

  const rules = parseLogicRules(game.logic_rules);
  const compiled = compileGameLogic({ game, links, rules });

  return {
    game,
    levels: compiled.levels,
    compiledLogic: compiled,
  };
}
