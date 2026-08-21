"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGame } from "@/app/actions/cms/games";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  STUDIO_TEST_MAX_PLAYERS,
  studioTestBookingReference,
} from "@/lib/cms/studio-test-session";
import { generateInviteCode, generateJoinCode } from "@/lib/grid/codes";
import { eventTeamJoinPath, cockpitPath } from "@/lib/grid/event-routes";
import { getCityIdBySlug } from "@/lib/grid/organizations";
import type { ActionResult } from "@/lib/grid/types";

export type StudioTestSession = {
  eventId: string;
  inviteCode: string;
  joinCode: string;
  /** Relative path — client prefixes origin for copy/share. */
  playPath: string;
  cockpitPath: string;
  maxPlayers: number;
  publishedVersionNumber: number;
};

async function loadPublishedVersion(gameId: string, versionNumber: number) {
  const supabase = createAdminClient();
  const { data: version, error } = await supabase
    .from("studio_game_versions")
    .select("id, snapshot")
    .eq("game_id", gameId)
    .eq("version_number", versionNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return version;
}

async function findActiveTestEvent(organizationId: string, gameId: string) {
  const supabase = createAdminClient();
  const bookingRef = studioTestBookingReference(gameId);
  const { data, error } = await supabase
    .from("events")
    .select("id, invite_code, status, studio_game_version_id")
    .eq("organization_id", organizationId)
    .eq("booking_reference", bookingRef)
    .in("status", ["lobby", "active", "draft"])
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function loadTestTeam(eventId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, join_code, status")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

function toSessionPayload(input: {
  eventId: string;
  inviteCode: string;
  joinCode: string;
  publishedVersionNumber: number;
}): StudioTestSession {
  return {
    eventId: input.eventId,
    inviteCode: input.inviteCode,
    joinCode: input.joinCode,
    playPath: eventTeamJoinPath(input.inviteCode, input.joinCode),
    cockpitPath: cockpitPath(input.inviteCode),
    maxPlayers: STUDIO_TEST_MAX_PLAYERS,
    publishedVersionNumber: input.publishedVersionNumber,
  };
}

async function createTestEventAndTeam(input: {
  orgId: string;
  gameId: string;
  gameName: string;
  gpsEnabled: boolean;
  citySlug: string | null;
  publishedVersionNumber: number;
  versionId: string;
  durationMinutes: number | null;
  runtimeProfiles: unknown;
}): Promise<StudioTestSession> {
  const supabase = createAdminClient();

  let cityId: string | null = null;
  if (input.gpsEnabled && input.citySlug) {
    cityId = await getCityIdBySlug(input.orgId, input.citySlug);
  }

  const inviteCode = generateInviteCode();
  const joinCode = generateJoinCode();
  const bookingRef = studioTestBookingReference(input.gameId);

  const contentConfig = {
    blueprint_slug: input.gpsEnabled ? "exitmania" : "tabbrain",
    city_slug: input.citySlug ?? undefined,
    ui_layout: input.gpsEnabled ? "exitmania" : "quiz",
    cms_game_id: input.gameId,
    cms_version_number: input.publishedVersionNumber,
    mission_duration_minutes: input.durationMinutes ?? 90,
    show_live_score: true,
    content_mode:
      input.runtimeProfiles &&
      typeof input.runtimeProfiles === "object" &&
      "default_mode" in input.runtimeProfiles
        ? (input.runtimeProfiles as { default_mode?: string }).default_mode
        : undefined,
    runtime_profiles: input.runtimeProfiles ?? undefined,
    allowed_fallbacks:
      input.runtimeProfiles &&
      typeof input.runtimeProfiles === "object" &&
      "allowed_fallbacks" in input.runtimeProfiles
        ? (input.runtimeProfiles as { allowed_fallbacks?: unknown }).allowed_fallbacks
        : undefined,
    is_studio_test: true,
  };

  const { data: event, error: insertError } = await supabase
    .from("events")
    .insert({
      title: `[Test] ${input.gameName}`,
      organization_id: input.orgId,
      city_id: cityId,
      invite_code: inviteCode,
      status: "lobby",
      max_teams: 1,
      max_players_per_team: STUDIO_TEST_MAX_PLAYERS,
      booking_reference: bookingRef,
      content_config: contentConfig,
      studio_game_version_id: input.versionId,
    })
    .select("id, invite_code")
    .single();

  if (insertError || !event) {
    throw new Error(insertError?.message ?? "Test-Event konnte nicht erstellt werden.");
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      event_id: event.id,
      organization_id: input.orgId,
      join_code: joinCode,
      name: "Testteam",
      max_size: STUDIO_TEST_MAX_PLAYERS,
      status: "lobby",
      department: "Studio",
      region: "Test",
      metadata: { is_studio_test: true },
    })
    .select("id, join_code")
    .single();

  if (teamError || !team) {
    await supabase.from("events").delete().eq("id", event.id);
    throw new Error(teamError?.message ?? "Test-Team konnte nicht erstellt werden.");
  }

  return toSessionPayload({
    eventId: event.id,
    inviteCode: event.invite_code,
    joinCode: team.join_code,
    publishedVersionNumber: input.publishedVersionNumber,
  });
}

async function resolveGameForTest(gameId: string) {
  const orgId = await getStudioOrganizationId();
  const gameResult = await getGame(gameId);
  if (!gameResult.success) {
    return { ok: false as const, error: gameResult.error };
  }
  if (!gameResult.data) {
    return { ok: false as const, error: "Game nicht gefunden." };
  }
  const game = gameResult.data;
  if (game.is_template) {
    return { ok: false as const, error: "Vorlagen können nicht getestet werden." };
  }
  if (game.status !== "published" || game.published_version_number < 1) {
    return {
      ok: false as const,
      error: "Nur veröffentlichte Spiele können getestet werden.",
    };
  }
  const version = await loadPublishedVersion(gameId, game.published_version_number);
  if (!version) {
    return { ok: false as const, error: "Veröffentlichte Version nicht gefunden." };
  }
  return { ok: true as const, orgId, game, version };
}

/**
 * Returns the existing Studio test session for this game, or creates one.
 * Same link continues progress; use regenerateStudioTestSession for a fresh start.
 */
export async function getOrCreateStudioTestSession(
  gameId: string,
): Promise<ActionResult<StudioTestSession>> {
  try {
    const resolved = await resolveGameForTest(gameId);
    if (!resolved.ok) return { success: false, error: resolved.error };

    const { orgId, game, version } = resolved;
    const existing = await findActiveTestEvent(orgId, gameId);
    if (existing) {
      const team = await loadTestTeam(existing.id);
      if (team) {
        if (existing.studio_game_version_id !== version.id) {
          const supabase = createAdminClient();
          const { data: fullEvent } = await supabase
            .from("events")
            .select("content_config")
            .eq("id", existing.id)
            .maybeSingle();
          const prevConfig =
            fullEvent?.content_config && typeof fullEvent.content_config === "object"
              ? (fullEvent.content_config as Record<string, unknown>)
              : {};
          await supabase
            .from("events")
            .update({
              studio_game_version_id: version.id,
              title: `[Test] ${game.name}`,
              content_config: {
                ...prevConfig,
                cms_game_id: game.id,
                cms_version_number: game.published_version_number,
                mission_duration_minutes: game.duration_minutes ?? 90,
                content_mode: game.runtime_profiles?.default_mode,
                runtime_profiles: game.runtime_profiles ?? undefined,
                allowed_fallbacks: game.runtime_profiles?.allowed_fallbacks,
                is_studio_test: true,
              },
            })
            .eq("id", existing.id);
        }
        return {
          success: true,
          data: toSessionPayload({
            eventId: existing.id,
            inviteCode: existing.invite_code,
            joinCode: team.join_code,
            publishedVersionNumber: game.published_version_number,
          }),
        };
      }
    }

    const session = await createTestEventAndTeam({
      orgId,
      gameId: game.id,
      gameName: game.name,
      gpsEnabled: game.gps_enabled,
      citySlug: game.city_slug,
      publishedVersionNumber: game.published_version_number,
      versionId: version.id,
      durationMinutes: game.duration_minutes,
      runtimeProfiles: game.runtime_profiles,
    });

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Testsession konnte nicht geladen werden.",
    };
  }
}

/** Archives the current test event and creates a fresh one (new invite + join codes). */
export async function regenerateStudioTestSession(
  gameId: string,
): Promise<ActionResult<StudioTestSession>> {
  try {
    const resolved = await resolveGameForTest(gameId);
    if (!resolved.ok) return { success: false, error: resolved.error };

    const { orgId, game, version } = resolved;
    const supabase = createAdminClient();
    const bookingRef = studioTestBookingReference(gameId);
    const existing = await findActiveTestEvent(orgId, gameId);

    if (existing) {
      const { error: archiveError } = await supabase
        .from("events")
        .update({
          status: "archived",
          booking_reference: `${bookingRef}:archived:${Date.now()}`,
          ended_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (archiveError) throw new Error(archiveError.message);
    }

    const session = await createTestEventAndTeam({
      orgId,
      gameId: game.id,
      gameName: game.name,
      gpsEnabled: game.gps_enabled,
      citySlug: game.city_slug,
      publishedVersionNumber: game.published_version_number,
      versionId: version.id,
      durationMinutes: game.duration_minutes,
      runtimeProfiles: game.runtime_profiles,
    });

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Testsession konnte nicht neu erzeugt werden.",
    };
  }
}

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
      content_mode: game.runtime_profiles?.default_mode,
      runtime_profiles: game.runtime_profiles ?? undefined,
      allowed_fallbacks: game.runtime_profiles?.allowed_fallbacks,
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
