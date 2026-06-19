"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTeamGameState } from "@/app/actions/game";
import {
  DEFAULT_LOBBY_AUTO_START_SECONDS,
  NAVIGATOR_OFFLINE_MS,
} from "@/lib/grid/constants";
import {
  generateInviteCode,
  generateJoinCode,
  isValidDisplayName,
  normalizeCode,
} from "@/lib/grid/codes";
import { writeAuditLog } from "@/lib/grid/audit-log";
import { canStartTeamGame } from "@/lib/grid/archetype-roles";
import { buildDefaultContentConfig, getBlueprint, isBlueprintSlug, resolveBlueprint, type BlueprintSlug } from "@/lib/grid/blueprints";
import { parseContentConfig } from "@/lib/grid/content-engine";
import { DEFAULT_CITY_SLUG } from "@/lib/grid/level-types";
import {
  getCityIdBySlug,
  getDefaultOrganizationId,
  getOrganizationBySlug,
} from "@/lib/grid/organizations";
import {
  signPlayerResumeToken,
  verifyPlayerResumeToken,
} from "@/lib/grid/resume-token";
import { SESSION_ACTIVE } from "@/lib/grid/session-codes";
import {
  assignArchetypeRoleOnJoin,
  buildPlayerSession,
  countActivePlayers,
  findActivePlayerByDisplayName,
  findActivePlayerById,
  rebalanceArchetypeRoles,
  rotatePlayerSession,
  setTeamBeta,
  setTeamNavigator,
  syncTeamLeadershipAfterPlayerLeaves,
} from "@/lib/grid/team-session";
import { teamEntryPath } from "@/lib/grid/team-routes";
import type {
  ActionResult,
  GridEvent,
  GridTeamStatus,
  LobbySnapshot,
  PlayerRole,
  PlayerSession,
} from "@/lib/grid/types";
import { randomUUID } from "crypto";

type TeamRow = {
  id: string;
  join_code: string;
  status: GridTeamStatus;
  navigator_player_id: string | null;
  captain_player_id?: string | null;
  beta_player_id?: string | null;
  current_level?: number;
};

type ActivePlayerRow = {
  id: string;
  session_id: string;
  display_name: string;
  is_captain: boolean;
  role: string;
  team_id: string;
  left_at?: string | null;
  last_seen_at?: string;
};

function lobbyTeamStatus(status: GridTeamStatus): GridTeamStatus {
  return status === "setup" ? "lobby" : status;
}

async function buildSessionForTeam(
  player: Pick<ActivePlayerRow, "id" | "session_id" | "display_name" | "is_captain" | "role">,
  team: Pick<
    TeamRow,
    "id" | "join_code" | "status" | "navigator_player_id" | "captain_player_id" | "beta_player_id"
  >,
  event: GridEvent,
): Promise<PlayerSession> {
  const activePlayerCount = await countActivePlayers(team.id);
  const blueprint = resolveBlueprint(parseContentConfig(event.content_config));

  return buildPlayerSession({
    player,
    teamId: team.id,
    joinCode: team.join_code,
    inviteCode: event.invite_code,
    teamStatus: lobbyTeamStatus(team.status),
    captainPlayerId: team.captain_player_id ?? null,
    navigatorPlayerId: team.navigator_player_id ?? null,
    betaPlayerId: team.beta_player_id ?? null,
    activePlayerCount,
    gpsEnabled: blueprint.capabilities.gps,
  });
}

async function assertCanStartGame(event: GridEvent, teamId: string): Promise<ActionResult<true>> {
  const activePlayerCount = await countActivePlayers(teamId);
  const blueprint = resolveBlueprint(parseContentConfig(event.content_config));
  const gate = canStartTeamGame({ activePlayerCount, blueprint });
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }
  return { success: true, data: true };
}

async function getEventByInviteCode(
  inviteCode: string,
): Promise<GridEvent | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, organization_id, organization_name, city_id, invite_code, status, max_teams, max_players_per_team, lobby_auto_start_seconds, content_config, route_override, booking_reference",
    )
    .eq("invite_code", normalizeCode(inviteCode))
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function getTeamByJoinCode(joinCode: string, eventId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("join_code", normalizeCode(joinCode))
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function getPlayerBySessionId(sessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("session_id", sessionId)
    .is("left_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function maybeAutoStartTeam(teamId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: team } = await supabase
    .from("teams")
    .select("id, status, lobby_auto_start_at, captain_player_id, event_id")
    .eq("id", teamId)
    .single();

  if (!team || team.status !== "lobby" || !team.lobby_auto_start_at) return;
  if (new Date(team.lobby_auto_start_at).getTime() > Date.now()) return;
  if (!team.captain_player_id) return;

  const { data: event } = await supabase
    .from("events")
    .select("id, organization_id, city_id, content_config, route_override, invite_code")
    .eq("id", team.event_id)
    .single();

  if (!event) return;

  const startGate = await assertCanStartGame(event as GridEvent, teamId);
  if (!startGate.success) return;

  const startedAt = new Date().toISOString();
  const { data: updated } = await supabase
    .from("teams")
    .update({
      status: "playing",
      started_at: startedAt,
    })
    .eq("id", teamId)
    .eq("status", "lobby")
    .select("id")
    .maybeSingle();

  if (updated) {
    if (event) {
      await initializeTeamGameState(
        teamId,
        team.captain_player_id,
        event.id,
        event.organization_id,
        event.city_id,
        event.content_config,
        event.route_override,
      );
    }
  }
}

export async function createEvent(input: {
  title: string;
  organizationName?: string;
  blueprintSlug?: BlueprintSlug;
}): Promise<ActionResult<GridEvent>> {
  try {
    const title = input.title.trim();
    if (title.length < 3) {
      return { success: false, error: "Titel muss mindestens 3 Zeichen haben." };
    }

    const blueprintSlug =
      input.blueprintSlug && isBlueprintSlug(input.blueprintSlug)
        ? input.blueprintSlug
        : "exitmania";
    const blueprint = getBlueprint(blueprintSlug);
    const orgSlug = blueprintSlug === "tabbrain" ? "tabbrain" : "exitmania";

    const supabase = createAdminClient();
    const inviteCode = generateInviteCode();
    const organization = await getOrganizationBySlug(orgSlug);
    if (!organization) {
      return { success: false, error: `Organisation „${orgSlug}" nicht gefunden.` };
    }

    let cityId: string | null = null;
    if (blueprint.capabilities.gps) {
      cityId = await getCityIdBySlug(organization.id, DEFAULT_CITY_SLUG);
      if (!cityId) {
        return { success: false, error: "Stadt für Exitmania-Blueprint nicht gefunden." };
      }
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        title,
        organization_id: organization.id,
        city_id: cityId,
        organization_name: input.organizationName?.trim() || null,
        invite_code: inviteCode,
        status: "lobby",
        content_config: buildDefaultContentConfig(blueprintSlug),
      })
      .select(
        "id, title, organization_id, organization_name, city_id, invite_code, status, max_teams, max_players_per_team, lobby_auto_start_seconds, booking_reference",
      )
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function getEventInvite(
  inviteCode: string,
): Promise<ActionResult<GridEvent>> {
  try {
    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    return { success: true, data: event };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function createTeamAsCaptain(input: {
  inviteCode: string;
  teamName: string;
  maxSize: number;
  department: string;
  region: string;
  displayName: string;
}): Promise<ActionResult<PlayerSession>> {
  try {
    const inviteCode = normalizeCode(input.inviteCode);
    const teamName = input.teamName.trim();
    const department = input.department.trim();
    const region = input.region.trim();
    const displayName = input.displayName.trim();

    if (teamName.length < 2) {
      return { success: false, error: "Teamname ist zu kurz." };
    }
    if (input.maxSize < 1 || input.maxSize > 8) {
      return { success: false, error: "Teamgröße muss zwischen 1 und 8 liegen." };
    }
    if (!department || !region) {
      return { success: false, error: "Abteilung und Region sind Pflichtfelder." };
    }
    if (!isValidDisplayName(displayName)) {
      return {
        success: false,
        error: "Spielername muss zwischen 2 und 32 Zeichen haben.",
      };
    }

    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }
    if (event.status === "completed" || event.status === "archived") {
      return { success: false, error: "Dieses Event ist nicht mehr aktiv." };
    }
    if (input.maxSize > event.max_players_per_team) {
      return {
        success: false,
        error: `Maximal ${event.max_players_per_team} Spieler pro Team erlaubt.`,
      };
    }

    const supabase = createAdminClient();
    const joinCode = generateJoinCode();
    const sessionId = randomUUID();
    const autoStartSeconds =
      event.lobby_auto_start_seconds || DEFAULT_LOBBY_AUTO_START_SECONDS;
    const lobbyOpenedAt = new Date();
    const lobbyAutoStartAt = new Date(
      lobbyOpenedAt.getTime() + autoStartSeconds * 1000,
    );

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        event_id: event.id,
        join_code: joinCode,
        name: teamName,
        max_size: input.maxSize,
        department,
        region,
        status: "lobby",
        lobby_opened_at: lobbyOpenedAt.toISOString(),
        lobby_auto_start_at: lobbyAutoStartAt.toISOString(),
      })
      .select("id, join_code")
      .single();

    if (teamError || !team) {
      return { success: false, error: teamError?.message ?? "Team konnte nicht erstellt werden." };
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        team_id: team.id,
        session_id: sessionId,
        display_name: displayName,
        is_captain: true,
        role: "alpha",
      })
      .select("id, display_name, is_captain, session_id, role")
      .single();

    if (playerError || !player) {
      await supabase.from("teams").delete().eq("id", team.id);
      return {
        success: false,
        error: playerError?.message ?? "Captain konnte nicht erstellt werden.",
      };
    }

    await supabase
      .from("teams")
      .update({ navigator_player_id: player.id })
      .eq("id", team.id);

    if (event.status === "draft") {
      await supabase.from("events").update({ status: "lobby" }).eq("id", event.id);
    }

    const refreshedTeam = await getTeamByJoinCode(team.join_code, event.id);

    return {
      success: true,
      data: await buildSessionForTeam(
        player,
        {
          id: team.id,
          join_code: team.join_code,
          status: "lobby",
          navigator_player_id: player.id,
          captain_player_id: player.id,
          beta_player_id: refreshedTeam?.beta_player_id ?? null,
        },
        event,
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function recoverSessionByPlayerId(input: {
  inviteCode: string;
  joinCode: string;
  playerId: string;
}): Promise<ActionResult<{ session: PlayerSession; path: string }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(normalizeCode(input.joinCode), event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    const player = await findActivePlayerById(team.id, input.playerId);
    if (!player) {
      return { success: false, error: "Spieler nicht mehr im Team aktiv." };
    }

    const sessionId = await rotatePlayerSession(player.id);

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: player.id,
      action: "session_recovered",
      payload: { display_name: player.display_name },
    });

    const session = await buildSessionForTeam(
      { ...player, session_id: sessionId },
      team,
      event,
    );

    return {
      success: true,
      data: {
        session,
        path: teamEntryPath(event.invite_code, team.join_code, team.status),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function verifyTeamSession(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<{ session: PlayerSession; path: string }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(normalizeCode(input.joinCode), event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    const player = await getPlayerBySessionId(input.sessionId);
    if (!player || player.team_id !== team.id) {
      return { success: false, error: "Session abgelaufen. Bitte erneut mit deinem Namen beitreten." };
    }

    return {
      success: true,
      data: {
        session: await buildSessionForTeam(player, team, event),
        path: teamEntryPath(event.invite_code, team.join_code, team.status),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function getPlayerResumeToken(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<{ resumeToken: string }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(normalizeCode(input.joinCode), event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    const player = await getPlayerBySessionId(input.sessionId);
    if (!player || player.team_id !== team.id) {
      return { success: false, error: "Session ungültig." };
    }

    const resumeToken = await signPlayerResumeToken({
      playerId: player.id,
      teamId: team.id,
      inviteCode: event.invite_code,
      joinCode: team.join_code,
    });

    return { success: true, data: { resumeToken } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function claimPlayerSession(input: {
  inviteCode: string;
  joinCode: string;
  resumeToken: string;
}): Promise<ActionResult<{ session: PlayerSession; path: string; resumeToken: string }>> {
  try {
    const payload = await verifyPlayerResumeToken(input.resumeToken);
    if (!payload) {
      return { success: false, error: "Spieler-Link ungültig oder abgelaufen." };
    }

    const inviteCode = normalizeCode(input.inviteCode);
    const joinCode = normalizeCode(input.joinCode);

    if (
      normalizeCode(payload.inviteCode) !== inviteCode ||
      normalizeCode(payload.joinCode) !== joinCode
    ) {
      return { success: false, error: "Spieler-Link passt nicht zu diesem Team." };
    }

    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(joinCode, event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    if (team.id !== payload.teamId) {
      return { success: false, error: "Spieler-Link passt nicht zu diesem Team." };
    }

    const player = await findActivePlayerById(team.id, payload.playerId);
    if (!player) {
      return { success: false, error: "Spieler nicht mehr im Team aktiv." };
    }

    const sessionId = await rotatePlayerSession(player.id);

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: player.id,
      action: "session_handoff",
      payload: { display_name: player.display_name },
    });

    const session = await buildSessionForTeam(
      { ...player, session_id: sessionId },
      team,
      event,
    );

    const resumeToken = await signPlayerResumeToken({
      playerId: player.id,
      teamId: team.id,
      inviteCode: event.invite_code,
      joinCode: team.join_code,
    });

    return {
      success: true,
      data: {
        session,
        path: teamEntryPath(event.invite_code, team.join_code, team.status),
        resumeToken,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function joinTeamAsPlayer(input: {
  inviteCode: string;
  joinCode: string;
  displayName: string;
  takeover?: boolean;
}): Promise<ActionResult<PlayerSession>> {
  try {
    const inviteCode = normalizeCode(input.inviteCode);
    const joinCode = normalizeCode(input.joinCode);
    const displayName = input.displayName.trim();

    if (!isValidDisplayName(displayName)) {
      return {
        success: false,
        error: "Spielername muss zwischen 2 und 32 Zeichen haben.",
      };
    }

    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(joinCode, event.id);
    if (!team) {
      return { success: false, error: "Team-Code ungültig oder gehört nicht zu diesem Event." };
    }
    if (team.status === "finished" || team.status === "disbanded") {
      return { success: false, error: "Dieses Team ist nicht mehr aktiv." };
    }

    const supabase = createAdminClient();
    const existingPlayer = await findActivePlayerByDisplayName(team.id, displayName);

    if (existingPlayer) {
      if (!input.takeover) {
        return {
          success: false,
          code: SESSION_ACTIVE,
          error: `${existingPlayer.display_name} ist bereits in diesem Team aktiv.`,
          meta: { displayName: existingPlayer.display_name },
        };
      }

      const sessionId = await rotatePlayerSession(existingPlayer.id);

      await writeAuditLog({
        organizationId: event.organization_id,
        eventId: event.id,
        teamId: team.id,
        playerId: existingPlayer.id,
        action: "session_takeover",
        payload: { display_name: existingPlayer.display_name },
      });

      return {
        success: true,
        data: await buildSessionForTeam(
          { ...existingPlayer, session_id: sessionId },
          team,
          event,
        ),
      };
    }

    const sessionId = randomUUID();

    const { data: player, error } = await supabase
      .from("players")
      .insert({
        team_id: team.id,
        session_id: sessionId,
        display_name: displayName,
        is_captain: false,
        role: "gamma",
      })
      .select("id, display_name, is_captain, session_id, role")
      .single();

    if (error || !player) {
      if (error?.message.includes("Team") && error.message.includes("full")) {
        return { success: false, error: "Das Team ist bereits voll." };
      }
      return { success: false, error: error?.message ?? "Beitritt fehlgeschlagen." };
    }

    await assignArchetypeRoleOnJoin(team.id, player.id);
    await rebalanceArchetypeRoles(team.id);
    const refreshedTeam = await getTeamByJoinCode(joinCode, event.id);
    if (!refreshedTeam) {
      return { success: false, error: "Team nach Beitritt nicht gefunden." };
    }

    const { data: refreshedPlayer } = await supabase
      .from("players")
      .select("id, display_name, is_captain, session_id, role")
      .eq("id", player.id)
      .single();

    if (team.status === "setup") {
      await supabase.from("teams").update({ status: "lobby" }).eq("id", team.id);
    }

    if (team.status === "playing") {
      await writeAuditLog({
        organizationId: event.organization_id,
        eventId: event.id,
        teamId: team.id,
        playerId: player.id,
        action: "player_joined_mid_game",
        payload: {
          display_name: displayName,
          current_level: team.current_level,
        },
      });
    }

    return {
      success: true,
      data: await buildSessionForTeam(
        refreshedPlayer ?? player,
        refreshedTeam,
        event,
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function getLobbySnapshot(input: {
  inviteCode: string;
  joinCode: string;
  sessionId?: string;
}): Promise<ActionResult<LobbySnapshot>> {
  try {
    const inviteCode = normalizeCode(input.inviteCode);
    const joinCode = normalizeCode(input.joinCode);

    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(joinCode, event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    if (input.sessionId) {
      const player = await getPlayerBySessionId(input.sessionId);
      if (!player || player.team_id !== team.id) {
        return { success: false, error: "Session ungültig." };
      }

      await createAdminClient()
        .from("players")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", player.id);
    }

    await maybeAutoStartTeam(team.id);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("team_lobby_snapshot")
      .select("*")
      .eq("join_code", joinCode)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message ?? "Lobby nicht gefunden." };
    }

    return {
      success: true,
      data: {
        ...data,
        players: Array.isArray(data.players) ? data.players : [],
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function startGameManually(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<{ startedAt: string }>> {
  try {
    const inviteCode = normalizeCode(input.inviteCode);
    const joinCode = normalizeCode(input.joinCode);

    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(joinCode, event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    const player = await getPlayerBySessionId(input.sessionId);
    if (!player || player.team_id !== team.id || !player.is_captain) {
      return { success: false, error: "Nur Alpha (Team Lead) kann die Mission starten." };
    }

    if (team.status !== "lobby") {
      return { success: false, error: "Das Team ist nicht mehr in der Lobby." };
    }

    const startGate = await assertCanStartGame(event, team.id);
    if (!startGate.success) {
      return startGate;
    }

    const startedAt = new Date().toISOString();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("teams")
      .update({
        status: "playing",
        started_at: startedAt,
      })
      .eq("id", team.id)
      .eq("status", "lobby");

    if (error) {
      return { success: false, error: error.message };
    }

    await initializeTeamGameState(
      team.id,
      player.id,
      event.id,
      event.organization_id,
      event.city_id,
      event.content_config,
      event.route_override,
    );

    await supabase
      .from("events")
      .update({ status: "active", started_at: startedAt })
      .eq("id", event.id)
      .in("status", ["draft", "lobby"]);

    return { success: true, data: { startedAt } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function resolveTeamJoinCode(input: {
  inviteCode: string;
  joinCode: string;
}): Promise<ActionResult<{ joinCode: string; teamName: string; teamStatus: GridTeamStatus }>> {
  try {
    const event = await getEventByInviteCode(input.inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(input.joinCode, event.id);
    if (!team) {
      return { success: false, error: "Team-Code ungültig." };
    }

    return {
      success: true,
      data: {
        joinCode: team.join_code,
        teamName: team.name,
        teamStatus: team.status,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function setupPrebookedTeamAsCaptain(input: {
  inviteCode: string;
  joinCode: string;
  teamName: string;
  maxSize: number;
  department: string;
  region: string;
  displayName: string;
}): Promise<ActionResult<PlayerSession>> {
  try {
    const inviteCode = normalizeCode(input.inviteCode);
    const joinCode = normalizeCode(input.joinCode);
    const teamName = input.teamName.trim();
    const department = input.department.trim();
    const region = input.region.trim();
    const displayName = input.displayName.trim();

    if (teamName.length < 2) {
      return { success: false, error: "Teamname ist zu kurz." };
    }
    if (input.maxSize < 1 || input.maxSize > 8) {
      return { success: false, error: "Teamgröße muss zwischen 1 und 8 liegen." };
    }
    if (!department || !region) {
      return { success: false, error: "Abteilung und Region sind Pflichtfelder." };
    }
    if (!isValidDisplayName(displayName)) {
      return {
        success: false,
        error: "Spielername muss zwischen 2 und 32 Zeichen haben.",
      };
    }

    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(joinCode, event.id);
    if (!team) {
      return { success: false, error: "Team-Code ungültig." };
    }
    if (team.status !== "setup") {
      return { success: false, error: "Dieses Team wurde bereits konfiguriert." };
    }
    if (team.captain_player_id) {
      return { success: false, error: "Dieses Team hat bereits einen Captain." };
    }
    if (input.maxSize > event.max_players_per_team) {
      return {
        success: false,
        error: `Maximal ${event.max_players_per_team} Spieler pro Team erlaubt.`,
      };
    }

    const supabase = createAdminClient();
    const sessionId = randomUUID();
    const autoStartSeconds =
      event.lobby_auto_start_seconds || DEFAULT_LOBBY_AUTO_START_SECONDS;
    const lobbyOpenedAt = new Date();
    const lobbyAutoStartAt = new Date(
      lobbyOpenedAt.getTime() + autoStartSeconds * 1000,
    );

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        team_id: team.id,
        session_id: sessionId,
        display_name: displayName,
        is_captain: true,
        role: "alpha",
      })
      .select("id, display_name, is_captain, session_id, role")
      .single();

    if (playerError || !player) {
      return {
        success: false,
        error: playerError?.message ?? "Captain konnte nicht erstellt werden.",
      };
    }

    const { error: teamError } = await supabase
      .from("teams")
      .update({
        name: teamName,
        max_size: input.maxSize,
        department,
        region,
        status: "lobby",
        lobby_opened_at: lobbyOpenedAt.toISOString(),
        lobby_auto_start_at: lobbyAutoStartAt.toISOString(),
        navigator_player_id: player.id,
      })
      .eq("id", team.id)
      .eq("status", "setup");

    if (teamError) {
      await supabase.from("players").delete().eq("id", player.id);
      return { success: false, error: teamError.message };
    }

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: player.id,
      action: "captain_claimed_prebooked_team",
      payload: { join_code: joinCode, team_name: teamName },
    });

    return {
      success: true,
      data: await buildSessionForTeam(
        player,
        { ...team, status: "lobby", navigator_player_id: player.id, captain_player_id: player.id },
        event,
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function handoverSession(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<{ left: true }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(normalizeCode(input.joinCode), event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    const player = await getPlayerBySessionId(input.sessionId);
    if (!player || player.team_id !== team.id) {
      return { success: false, error: "Session ungültig." };
    }

    const supabase = createAdminClient();
    const leftAt = new Date().toISOString();
    const wasCaptain = player.is_captain;
    const wasNavigator = team.navigator_player_id === player.id;

    const { error } = await supabase
      .from("players")
      .update({
        left_at: leftAt,
        is_captain: false,
        role: "solver",
      })
      .eq("id", player.id);

    if (error) {
      return { success: false, error: error.message };
    }

    await syncTeamLeadershipAfterPlayerLeaves({
      teamId: team.id,
      organizationId: event.organization_id,
      eventId: event.id,
      playerId: player.id,
      wasCaptain,
      wasNavigator,
    });

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: player.id,
      action: "session_handover",
      payload: { display_name: player.display_name },
    });

    return { success: true, data: { left: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function transferCaptain(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  targetPlayerId: string;
}): Promise<ActionResult<{ newCaptainId: string }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(normalizeCode(input.joinCode), event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    const captain = await getPlayerBySessionId(input.sessionId);
    if (!captain || captain.team_id !== team.id || !captain.is_captain) {
      return { success: false, error: "Nur Alpha kann die Rolle übertragen." };
    }

    const supabase = createAdminClient();
    const { data: target, error: targetError } = await supabase
      .from("players")
      .select("id, display_name, team_id, left_at")
      .eq("id", input.targetPlayerId)
      .maybeSingle();

    if (targetError || !target || target.team_id !== team.id || target.left_at) {
      return { success: false, error: "Zielspieler nicht gefunden oder inaktiv." };
    }

    await supabase
      .from("players")
      .update({ is_captain: false, role: "gamma" })
      .eq("id", captain.id);

    const { error: promoteError } = await supabase
      .from("players")
      .update({ is_captain: true, role: "alpha" })
      .eq("id", target.id);

    if (promoteError) {
      await supabase
        .from("players")
        .update({ is_captain: true, role: "alpha" })
        .eq("id", captain.id);
      return { success: false, error: promoteError.message };
    }

    await setTeamNavigator(team.id, target.id);
    await rebalanceArchetypeRoles(team.id);

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: captain.id,
      action: "captain_transferred",
      payload: {
        from_player_id: captain.id,
        to_player_id: target.id,
        to_display_name: target.display_name,
      },
    });

    return { success: true, data: { newCaptainId: target.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function assignPlayerRole(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  targetPlayerId: string;
  role: "beta" | "gamma" | "navigator" | "solver";
}): Promise<ActionResult<{ playerId: string; role: PlayerRole }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(normalizeCode(input.joinCode), event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    const captain = await getPlayerBySessionId(input.sessionId);
    if (!captain || captain.team_id !== team.id || !captain.is_captain) {
      return { success: false, error: "Nur Alpha kann Rollen zuweisen." };
    }

    const supabase = createAdminClient();
    const { data: target, error: targetError } = await supabase
      .from("players")
      .select("id, is_captain, left_at, team_id")
      .eq("id", input.targetPlayerId)
      .maybeSingle();

    if (targetError || !target || target.team_id !== team.id || target.left_at) {
      return { success: false, error: "Spieler nicht gefunden." };
    }
    if (target.is_captain) {
      return { success: false, error: "Alpha-Rolle kann nur per Transfer geändert werden." };
    }

    if (input.role === "beta") {
      await supabase
        .from("players")
        .update({ role: "gamma" })
        .eq("team_id", team.id)
        .eq("role", "beta")
        .is("left_at", null);
      await supabase.from("players").update({ role: "beta" }).eq("id", target.id);
      await setTeamBeta(team.id, target.id);
    } else {
      await supabase.from("players").update({ role: "gamma" }).eq("id", target.id);
      if (team.beta_player_id === target.id) {
        await setTeamBeta(team.id, null);
      }
    }

    await rebalanceArchetypeRoles(team.id);

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: captain.id,
      action: "player_role_assigned",
      payload: { target_player_id: target.id, role: input.role === "beta" ? "beta" : "gamma" },
    });

    return {
      success: true,
      data: { playerId: target.id, role: input.role === "beta" ? "beta" : "gamma" },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function removePlayerFromLobby(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  targetPlayerId: string;
}): Promise<ActionResult<{ removed: true }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(normalizeCode(input.joinCode), event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    if (team.status !== "lobby" && team.status !== "setup") {
      return { success: false, error: "Spieler können nur in der Lobby entfernt werden." };
    }

    const captain = await getPlayerBySessionId(input.sessionId);
    if (!captain || captain.team_id !== team.id || !captain.is_captain) {
      return { success: false, error: "Nur der Captain kann Spieler entfernen." };
    }

    if (input.targetPlayerId === captain.id) {
      return { success: false, error: "Nutze „Gerät übergeben“, um deinen Platz freizugeben." };
    }

    const supabase = createAdminClient();
    const { data: target, error: targetError } = await supabase
      .from("players")
      .select("id, display_name, is_captain, left_at, team_id")
      .eq("id", input.targetPlayerId)
      .maybeSingle();

    if (targetError || !target || target.team_id !== team.id || target.left_at) {
      return { success: false, error: "Spieler nicht gefunden." };
    }

    if (target.is_captain) {
      return { success: false, error: "Captain kann nicht entfernt werden." };
    }

    const wasNavigator = team.navigator_player_id === target.id;
    const leftAt = new Date().toISOString();

    const { error } = await supabase
      .from("players")
      .update({
        left_at: leftAt,
        is_captain: false,
        role: "solver",
      })
      .eq("id", target.id);

    if (error) {
      return { success: false, error: error.message };
    }

    await syncTeamLeadershipAfterPlayerLeaves({
      teamId: team.id,
      organizationId: event.organization_id,
      eventId: event.id,
      playerId: target.id,
      wasCaptain: false,
      wasNavigator,
    });

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: captain.id,
      action: "player_removed_from_lobby",
      payload: {
        target_player_id: target.id,
        target_display_name: target.display_name,
      },
    });

    return { success: true, data: { removed: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function transferTeamNavigator(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  targetPlayerId: string;
}): Promise<ActionResult<{ navigatorPlayerId: string }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(normalizeCode(input.joinCode), event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    const actor = await getPlayerBySessionId(input.sessionId);
    if (!actor || actor.team_id !== team.id || !actor.is_captain) {
      return { success: false, error: "Nur der Captain kann den Team Lead (GPS) setzen." };
    }

    const supabase = createAdminClient();
    const { data: target, error: targetError } = await supabase
      .from("players")
      .select("id, display_name, left_at, team_id")
      .eq("id", input.targetPlayerId)
      .maybeSingle();

    if (targetError || !target || target.team_id !== team.id || target.left_at) {
      return { success: false, error: "Spieler nicht gefunden." };
    }

    await setTeamNavigator(team.id, target.id);

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: actor.id,
      action: "navigator_transferred",
      payload: {
        to_player_id: target.id,
        to_display_name: target.display_name,
      },
    });

    return { success: true, data: { navigatorPlayerId: target.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function claimTeamNavigator(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<{ navigatorPlayerId: string }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(input.inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const team = await getTeamByJoinCode(normalizeCode(input.joinCode), event.id);
    if (!team) {
      return { success: false, error: "Team nicht gefunden." };
    }

    const claimer = await getPlayerBySessionId(input.sessionId);
    if (!claimer || claimer.team_id !== team.id) {
      return { success: false, error: "Session ungültig." };
    }

    if (team.navigator_player_id === claimer.id) {
      return { success: false, error: "Du bist bereits Team Lead (GPS)." };
    }

    const supabase = createAdminClient();

    if (team.navigator_player_id) {
      const { data: currentNavigator } = await supabase
        .from("players")
        .select("id, left_at, last_seen_at")
        .eq("id", team.navigator_player_id)
        .eq("team_id", team.id)
        .maybeSingle();

      if (currentNavigator && !currentNavigator.left_at) {
        const lastSeenMs = new Date(currentNavigator.last_seen_at).getTime();
        if (Date.now() - lastSeenMs < NAVIGATOR_OFFLINE_MS) {
          return {
            success: false,
            error: "Team Lead ist noch aktiv. Captain kann die Rolle übertragen.",
          };
        }
      }
    }

    await setTeamNavigator(team.id, claimer.id);

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: claimer.id,
      action: "navigator_claimed",
      payload: { display_name: claimer.display_name },
    });

    return { success: true, data: { navigatorPlayerId: claimer.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}
