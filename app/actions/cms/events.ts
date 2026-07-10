"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGame } from "@/app/actions/cms/games";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import { generateInviteCode } from "@/lib/grid/codes";
import { getCityIdBySlug } from "@/lib/grid/organizations";
import type { ActionResult } from "@/lib/grid/types";

export async function createLiveEventFromGame(
  gameId: string,
): Promise<ActionResult<{ inviteCode: string; eventId: string; joinPath: string }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const gameResult = await getGame(gameId);
    if (!gameResult.success) {
      return { success: false, error: gameResult.error };
    }
    if (!gameResult.data) {
      return { success: false, error: "Game nicht gefunden." };
    }

    const game = gameResult.data;
    if (game.is_template) {
      return { success: false, error: "Vorlagen können nicht als Live-Event gestartet werden." };
    }
    if (game.published_version_number < 1) {
      return {
        success: false,
        error: "Zuerst „Version veröffentlichen“, dann Live-Event starten.",
      };
    }

    const supabase = createAdminClient();
    const { data: version, error: versionError } = await supabase
      .from("studio_game_versions")
      .select("id, snapshot")
      .eq("game_id", gameId)
      .eq("version_number", game.published_version_number)
      .maybeSingle();

    if (versionError) throw new Error(versionError.message);
    if (!version) {
      return { success: false, error: "Veröffentlichte Version nicht gefunden." };
    }

    let cityId: string | null = null;
    if (game.gps_enabled && game.city_slug) {
      cityId = await getCityIdBySlug(orgId, game.city_slug);
    }

    const inviteCode = generateInviteCode();
    const contentConfig = {
      blueprint_slug: game.gps_enabled ? "exitmania" : "tabbrain",
      city_slug: game.city_slug ?? undefined,
      ui_layout: game.gps_enabled ? "exitmania" : "quiz",
      cms_game_id: game.id,
      cms_version_number: game.published_version_number,
      mission_duration_minutes: game.duration_minutes ?? 90,
      show_live_score: true,
    };

    const { data: event, error: insertError } = await supabase
      .from("events")
      .insert({
        title: game.name,
        organization_id: orgId,
        city_id: cityId,
        invite_code: inviteCode,
        status: "lobby",
        content_config: contentConfig,
        studio_game_version_id: version.id,
      })
      .select("id, invite_code")
      .single();

    if (insertError) throw new Error(insertError.message);

    revalidatePath("/admin/games");
    revalidatePath(`/admin/games/${gameId}`);

    return {
      success: true,
      data: {
        inviteCode: event.invite_code,
        eventId: event.id,
        joinPath: `/e/${event.invite_code}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Live-Event konnte nicht erstellt werden.",
    };
  }
}
