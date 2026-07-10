"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseLogicRules, type StudioLogicRule } from "@/lib/cms/logic-rules";
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
