"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPlayerSession } from "@/lib/grid/session-auth";
import { parseTeamGameState } from "@/lib/grid/game-state";
import { parseGrowthPack } from "@/lib/grid/growth-pack";
import { postGrowthCapture } from "@/lib/grid/growth-dispatch";
import { getPublicOrigin } from "@/lib/grid/booking-api";
import { buildEventPortalResultsUrl } from "@/lib/grid/codes";
import { ensureEventPortalToken } from "@/lib/grid/portal";
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

/** Studio-Test: the results URL that would go in the HR recap mail. */
export async function getStudioRecapLinks(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<{ resultsUrl: string }>> {
  try {
    const { event, team } = await assertPlayerSession(input);
    if (team.status !== "finished") {
      return { success: false, error: "Das Spiel läuft noch." };
    }
    const config = event.content_config;
    const isStudio =
      Boolean(config && typeof config === "object" && (config as { is_studio_test?: boolean }).is_studio_test);
    if (!isStudio) {
      return { success: false, error: "Nur im Studio-Test." };
    }

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("events")
      .select("portal_token")
      .eq("id", event.id)
      .maybeSingle();

    const token = await ensureEventPortalToken(event.id, data?.portal_token ?? null);
    const headerList = await headers();
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
    const origin = getPublicOrigin(new Request(`${proto}://${host}`));
    return { success: true, data: { resultsUrl: buildEventPortalResultsUrl(origin, token) } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Link nicht verfügbar.",
    };
  }
}
