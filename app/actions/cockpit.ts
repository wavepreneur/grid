"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import { parseTeamGameState } from "@/lib/grid/game-state";
import { setTeamNavigator } from "@/lib/grid/team-session";
import { writeAuditLog } from "@/lib/grid/audit-log";
import { getEventByInviteCode } from "@/lib/grid/session-auth";
import { normalizeCode } from "@/lib/grid/codes";
import type { LevelDefinition } from "@/lib/grid/level-types";
import type { ActionResult } from "@/lib/grid/types";
import {
  applyGpsTestOverride,
  getEventAdminDetails,
  updateEventRouteOverride,
} from "@/app/actions/content";

export type CockpitPlayer = {
  id: string;
  display_name: string;
  is_captain: boolean;
  is_navigator: boolean;
};

export type CockpitTeam = {
  id: string;
  join_code: string;
  name: string;
  status: string;
  current_level: number;
  score: number;
  captain_name: string | null;
  navigator_player_id: string | null;
  navigator_name: string | null;
  active_player_count: number;
  players: CockpitPlayer[];
};

export type CockpitLevel = {
  level: number;
  type: LevelDefinition["type"];
  title: string;
  gps_enabled: boolean;
  has_override: boolean;
};

export type EventCockpitSnapshot = {
  invite_code: string;
  title: string;
  status: string;
  teams: CockpitTeam[];
  levels: CockpitLevel[];
  route_override_json: string;
};

function formatRouteOverride(value: unknown): string {
  if (!value || (typeof value === "object" && Object.keys(value as object).length === 0)) {
    return "{}";
  }
  return JSON.stringify(value, null, 2);
}

export async function getEventCockpitSnapshot(
  inviteCode: string,
): Promise<ActionResult<EventCockpitSnapshot>> {
  try {
    const normalized = normalizeCode(inviteCode);
    const event = await getEventByInviteCode(normalized);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
    });

    const override =
      event.route_override && typeof event.route_override === "object"
        ? (event.route_override as { levels?: Record<string, unknown> })
        : {};
    const overrideLevels = override.levels ?? {};

    const supabase = createAdminClient();
    const { data: teams, error } = await supabase
      .from("teams")
      .select(
        "id, join_code, name, status, current_level, game_state, navigator_player_id, captain_player_id",
      )
      .eq("event_id", event.id)
      .neq("status", "disbanded")
      .order("join_code");

    if (error) {
      return { success: false, error: error.message };
    }

    const teamRows = teams ?? [];
    const teamIds = teamRows.map((team) => team.id);

    const { data: players } = teamIds.length
      ? await supabase
          .from("players")
          .select("id, team_id, display_name, is_captain, left_at")
          .in("team_id", teamIds)
          .is("left_at", null)
          .order("joined_at")
      : { data: [] };

    const playersByTeam = new Map<string, typeof players>();
    for (const player of players ?? []) {
      const list = playersByTeam.get(player.team_id) ?? [];
      list.push(player);
      playersByTeam.set(player.team_id, list);
    }

    const cockpitTeams: CockpitTeam[] = teamRows.map((team) => {
      const teamPlayers = playersByTeam.get(team.id) ?? [];
      const gameState = parseTeamGameState(team.game_state);
      const navigator = teamPlayers.find((p) => p.id === team.navigator_player_id);

      return {
        id: team.id,
        join_code: team.join_code,
        name: team.name,
        status: team.status,
        current_level: team.current_level ?? 0,
        score: gameState.score ?? 0,
        captain_name:
          teamPlayers.find((p) => p.is_captain)?.display_name ??
          teamPlayers.find((p) => p.id === team.captain_player_id)?.display_name ??
          null,
        navigator_player_id: team.navigator_player_id,
        navigator_name: navigator?.display_name ?? null,
        active_player_count: teamPlayers.length,
        players: teamPlayers.map((player) => ({
          id: player.id,
          display_name: player.display_name,
          is_captain: player.is_captain,
          is_navigator: player.id === team.navigator_player_id,
        })),
      };
    });

    const levels: CockpitLevel[] = content.levels.map((level) => {
      const patch = overrideLevels[String(level.level)];
      const patchType =
        patch && typeof patch === "object" && "type" in patch
          ? (patch as { type?: string }).type
          : undefined;

      return {
        level: level.level,
        type: level.type,
        title: level.title,
        gps_enabled: level.type === "gps",
        has_override: Boolean(patch),
      };
    });

    return {
      success: true,
      data: {
        invite_code: event.invite_code,
        title: event.title,
        status: event.status,
        teams: cockpitTeams,
        levels,
        route_override_json: formatRouteOverride(event.route_override),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

async function mergeRouteOverrideLevel(
  inviteCode: string,
  level: number,
  patch: Record<string, unknown> | null,
): Promise<ActionResult<{ routeOverrideJson: string }>> {
  const event = await getEventByInviteCode(normalizeCode(inviteCode));
  if (!event) {
    return { success: false, error: "Event nicht gefunden." };
  }

  const existing =
    event.route_override && typeof event.route_override === "object"
      ? { ...(event.route_override as Record<string, unknown>) }
      : {};
  const levels =
    existing.levels && typeof existing.levels === "object"
      ? { ...(existing.levels as Record<string, unknown>) }
      : {};

  if (patch === null) {
    delete levels[String(level)];
  } else {
    levels[String(level)] = {
      ...(typeof levels[String(level)] === "object"
        ? (levels[String(level)] as Record<string, unknown>)
        : {}),
      ...patch,
    };
  }

  const merged = {
    ...existing,
    levels,
  };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("events")
    .update({ route_override: merged })
    .eq("id", event.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: { routeOverrideJson: formatRouteOverride(merged) },
  };
}

export async function operatorDisableLevelGps(input: {
  inviteCode: string;
  level: number;
  bypassAnswer?: string;
}): Promise<ActionResult<{ level: number }>> {
  try {
    const result = await mergeRouteOverrideLevel(input.inviteCode, input.level, {
      type: "digital",
      answer: input.bypassAnswer ?? "skip",
    });

    if (!result.success) return result;

    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (event) {
      await writeAuditLog({
        organizationId: event.organization_id,
        eventId: event.id,
        action: "operator_gps_disabled",
        payload: { level: input.level },
      });
    }

    return { success: true, data: { level: input.level } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function operatorEnableLevelGps(input: {
  inviteCode: string;
  level: number;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
}): Promise<ActionResult<{ level: number }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
    });

    const baseLevel = content.levels.find((l) => l.level === input.level);
    if (!baseLevel?.location && !input.lat) {
      return { success: false, error: "Keine GPS-Koordinaten für dieses Level." };
    }

    const location = {
      lat: input.lat ?? baseLevel!.location!.lat,
      lng: input.lng ?? baseLevel!.location!.lng,
      radius_meters: input.radiusMeters ?? baseLevel!.location!.radius_meters ?? 80,
    };

    const result = await mergeRouteOverrideLevel(input.inviteCode, input.level, {
      type: "gps",
      location,
    });

    if (!result.success) return result;

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      action: "operator_gps_enabled",
      payload: { level: input.level, location },
    });

    return { success: true, data: { level: input.level } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function operatorClearLevelOverride(input: {
  inviteCode: string;
  level: number;
}): Promise<ActionResult<{ level: number }>> {
  try {
    const result = await mergeRouteOverrideLevel(input.inviteCode, input.level, null);
    if (!result.success) return result;
    return { success: true, data: { level: input.level } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function operatorSetTeamNavigator(input: {
  inviteCode: string;
  joinCode: string;
  playerId: string;
}): Promise<ActionResult<{ navigatorName: string }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const supabase = createAdminClient();
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, event_id, join_code")
      .eq("join_code", normalizeCode(input.joinCode))
      .eq("event_id", event.id)
      .maybeSingle();

    if (teamError || !team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, display_name, team_id, left_at")
      .eq("id", input.playerId)
      .maybeSingle();

    if (playerError || !player || player.team_id !== team.id || player.left_at) {
      return { success: false, error: "Spieler nicht gefunden." };
    }

    await setTeamNavigator(team.id, player.id);

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: player.id,
      action: "operator_navigator_set",
      payload: {
        join_code: team.join_code,
        display_name: player.display_name,
      },
    });

    return { success: true, data: { navigatorName: player.display_name } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export {
  applyGpsTestOverride,
  getEventAdminDetails,
  updateEventRouteOverride,
};
