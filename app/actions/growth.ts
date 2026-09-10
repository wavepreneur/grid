"use server";

import { assertPlayerSession } from "@/lib/grid/session-auth";
import { parseTeamGameState } from "@/lib/grid/game-state";
import { parseGrowthPack } from "@/lib/grid/growth-pack";
import { postGrowthCapture } from "@/lib/grid/growth-dispatch";
import type { ActionResult } from "@/lib/grid/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitGrowthRecap(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  email: string;
}): Promise<ActionResult<{ sent: true }>> {
  try {
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 160) {
      return { success: false, error: "Bitte eine gültige E-Mail eingeben." };
    }

    const { event, team, player } = await assertPlayerSession(input);
    if (team.status !== "finished") {
      return { success: false, error: "Das Spiel läuft noch." };
    }

    const pack = parseGrowthPack(event.content_config);
    if (!pack.enabled || !pack.capture_url) {
      return { success: false, error: "Recap ist für dieses Event nicht aktiv." };
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    const { data: captures } = await supabase
      .from("event_captures")
      .select("public_url")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false })
      .limit(4);

    const score = parseTeamGameState(team.game_state).score ?? 0;
    const posted = await postGrowthCapture({
      captureUrl: pack.capture_url,
      captureSecret: pack.capture_secret,
      body: {
        type: "player.recap",
        booking_reference: event.booking_reference ?? null,
        invite_code: event.invite_code,
        team_id: team.id,
        team_name: team.name,
        player_id: player.id,
        player_name: player.display_name,
        email,
        score,
        photo_urls: (captures ?? [])
          .map((row) => row.public_url)
          .filter((url): url is string => typeof url === "string" && url.startsWith("http")),
      },
    });

    if (!posted.ok) {
      return { success: false, error: "Konnte die Mail gerade nicht senden. Bitte nochmal versuchen." };
    }

    return { success: true, data: { sent: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Recap fehlgeschlagen.",
    };
  }
}
