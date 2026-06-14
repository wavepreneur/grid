"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { signPlayerAccessToken } from "@/lib/grid/realtime-token";
import type { ActionResult } from "@/lib/grid/types";
import type { RealtimeAccessToken } from "@/lib/grid/realtime-token";

export async function getRealtimeAccessToken(
  sessionId: string,
): Promise<ActionResult<RealtimeAccessToken>> {
  try {
    const supabase = createAdminClient();
    const { data: player, error } = await supabase
      .from("players")
      .select("id, team_id, session_id, left_at")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    if (!player || player.left_at) {
      return { success: false, error: "Session ungültig." };
    }

    const token = await signPlayerAccessToken({
      playerId: player.id,
      sessionId: player.session_id,
      teamId: player.team_id,
    });

    return { success: true, data: token };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}
