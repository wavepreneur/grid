"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  compileGameLogic,
  parseLogicRules,
  type StudioLogicRule,
} from "@/lib/cms/logic-rules";
import { getGame, listGameTasks } from "@/app/actions/cms/games";
import type { ActionResult } from "@/lib/grid/types";

export async function updateGameLogicRules(
  gameId: string,
  rules: StudioLogicRule[],
): Promise<ActionResult<{ count: number }>> {
  try {
    const normalized = parseLogicRules(rules);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("studio_games")
      .update({
        logic_rules: normalized,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (error) throw new Error(error.message);
    revalidatePath(`/admin/games/${gameId}`);
    return { success: true, data: { count: normalized.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Logik konnte nicht gespeichert werden.",
    };
  }
}

export async function previewCompiledLogic(gameId: string): Promise<
  ActionResult<ReturnType<typeof compileGameLogic>>
> {
  try {
    const gameResult = await getGame(gameId);
    if (!gameResult.success || !gameResult.data) {
      return { success: false, error: "Game nicht gefunden." };
    }
    const linksResult = await listGameTasks(gameId);
    if (!linksResult.success) {
      return { success: false, error: linksResult.error };
    }

    const compiled = compileGameLogic({
      game: gameResult.data,
      links: linksResult.data ?? [],
      rules: parseLogicRules(gameResult.data.logic_rules),
    });

    return { success: true, data: compiled };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Vorschau fehlgeschlagen.",
    };
  }
}
