import { createAdminClient } from "@/lib/supabase/admin";
import { parseLevelDefinitions } from "@/lib/grid/content-engine";
import type { LevelDefinition } from "@/lib/grid/level-types";
import type { StudioGame } from "@/lib/cms/types";

export type StudioVersionSnapshot = {
  game: StudioGame;
  levels: LevelDefinition[];
};

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
  return { game, levels };
}
