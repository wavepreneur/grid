import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/grid/audit-log";
import {
  archetypeRoleForJoinOrder,
  buildArchetypeSessionFields,
} from "@/lib/grid/archetype-roles";
import type { ArchetypeRole } from "@/lib/grid/archetype-roles";
import type { GridTeamStatus, PlayerSession } from "@/lib/grid/types";

type ActivePlayer = {
  id: string;
  team_id: string;
  session_id: string;
  display_name: string;
  is_captain: boolean;
  role: string;
};

export function buildPlayerSession(input: {
  player: Pick<ActivePlayer, "id" | "session_id" | "display_name" | "is_captain" | "role">;
  teamId: string;
  joinCode: string;
  inviteCode: string;
  teamStatus: GridTeamStatus;
  captainPlayerId: string | null;
  navigatorPlayerId: string | null;
  betaPlayerId: string | null;
  activePlayerCount: number;
  gpsEnabled: boolean;
}): PlayerSession {
  const isNavigator = input.navigatorPlayerId === input.player.id;
  const archetypeFields = buildArchetypeSessionFields({
    playerId: input.player.id,
    playerRole: input.player.role,
    isCaptain: input.player.is_captain,
    team: {
      captainPlayerId: input.captainPlayerId,
      navigatorPlayerId: input.navigatorPlayerId,
      betaPlayerId: input.betaPlayerId,
    },
    activePlayerCount: input.activePlayerCount,
    gpsEnabled: input.gpsEnabled,
  });

  return {
    playerId: input.player.id,
    sessionId: input.player.session_id,
    displayName: input.player.display_name,
    teamId: input.teamId,
    joinCode: input.joinCode,
    inviteCode: input.inviteCode,
    isCaptain: input.player.is_captain,
    isNavigator,
    ...archetypeFields,
    teamStatus: input.teamStatus,
  };
}

export async function countActivePlayers(teamId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .is("left_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listActivePlayersOrdered(teamId: string): Promise<ActivePlayer[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, team_id, session_id, display_name, is_captain, role")
    .eq("team_id", teamId)
    .is("left_at", null)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ActivePlayer[]) ?? [];
}

export async function setTeamBeta(teamId: string, betaPlayerId: string | null): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("teams")
    .update({ beta_player_id: betaPlayerId })
    .eq("id", teamId);

  if (error) throw new Error(error.message);
}

export async function assignArchetypeRoleOnJoin(teamId: string, playerId: string): Promise<void> {
  const players = await listActivePlayersOrdered(teamId);
  const joinOrder = players.findIndex((player) => player.id === playerId) + 1;
  if (joinOrder <= 0) return;

  const role = archetypeRoleForJoinOrder(joinOrder);
  const supabase = createAdminClient();

  if (role === "beta") {
    await supabase.from("players").update({ role: "beta" }).eq("id", playerId);
    await setTeamBeta(teamId, playerId);
    return;
  }

  if (role === "gamma") {
    await supabase.from("players").update({ role: "gamma" }).eq("id", playerId);
  }
}

export async function rebalanceArchetypeRoles(teamId: string): Promise<void> {
  const players = await listActivePlayersOrdered(teamId);
  const supabase = createAdminClient();

  if (players.length === 0) {
    await setTeamBeta(teamId, null);
    return;
  }

  const alpha = players.find((player) => player.is_captain) ?? players[0];
  let betaId: string | null = null;

  for (let index = 0; index < players.length; index += 1) {
    const player = players[index];
    let role: ArchetypeRole;

    if (player.id === alpha.id) {
      role = "alpha";
      if (!player.is_captain) {
        await supabase.from("players").update({ is_captain: true, role: "alpha" }).eq("id", player.id);
      } else if (player.role !== "alpha") {
        await supabase.from("players").update({ role: "alpha" }).eq("id", player.id);
      }
      await setTeamNavigator(teamId, player.id);
      continue;
    }

    if (players.length >= 2 && !betaId) {
      role = "beta";
      betaId = player.id;
      await supabase.from("players").update({ role: "beta", is_captain: false }).eq("id", player.id);
      continue;
    }

    role = "gamma";
    await supabase
      .from("players")
      .update({ role: "gamma", is_captain: false })
      .eq("id", player.id);
  }

  await setTeamBeta(teamId, players.length >= 2 ? betaId : null);
}

export async function findActivePlayerByDisplayName(
  teamId: string,
  displayName: string,
): Promise<ActivePlayer | null> {
  const supabase = createAdminClient();
  const normalized = displayName.trim().toLowerCase();

  const { data, error } = await supabase
    .from("players")
    .select("id, team_id, session_id, display_name, is_captain, role")
    .eq("team_id", teamId)
    .is("left_at", null);

  if (error) throw new Error(error.message);

  return (
    (data as ActivePlayer[] | null)?.find(
      (player) => player.display_name.toLowerCase() === normalized,
    ) ?? null
  );
}

export async function findActivePlayerById(
  teamId: string,
  playerId: string,
): Promise<ActivePlayer | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, team_id, session_id, display_name, is_captain, role")
    .eq("id", playerId)
    .eq("team_id", teamId)
    .is("left_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ActivePlayer | null) ?? null;
}

export async function rotatePlayerSession(playerId: string): Promise<string> {
  const supabase = createAdminClient();
  const sessionId = randomUUID();

  const { error } = await supabase
    .from("players")
    .update({
      session_id: sessionId,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", playerId);

  if (error) throw new Error(error.message);
  return sessionId;
}

export async function setTeamNavigator(
  teamId: string,
  navigatorPlayerId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("teams")
    .update({ navigator_player_id: navigatorPlayerId })
    .eq("id", teamId);

  if (error) throw new Error(error.message);
}

export async function promoteNextNavigator(input: {
  teamId: string;
  organizationId: string;
  eventId: string;
  reason: string;
  excludePlayerId?: string;
}): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: team } = await supabase
    .from("teams")
    .select("navigator_player_id, captain_player_id")
    .eq("id", input.teamId)
    .single();

  if (team?.captain_player_id) {
    await setTeamNavigator(input.teamId, team.captain_player_id);
    return team.captain_player_id;
  }

  const { data: nextPlayer, error } = await supabase
    .from("players")
    .select("id, display_name")
    .eq("team_id", input.teamId)
    .is("left_at", null)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!nextPlayer) {
    await supabase.from("teams").update({ navigator_player_id: null }).eq("id", input.teamId);
    return null;
  }

  await setTeamNavigator(input.teamId, nextPlayer.id);
  await writeAuditLog({
    organizationId: input.organizationId,
    eventId: input.eventId,
    teamId: input.teamId,
    playerId: nextPlayer.id,
    action: "navigator_auto_promoted",
    payload: { reason: input.reason, display_name: nextPlayer.display_name },
  });

  return nextPlayer.id;
}

export async function promoteNextCaptain(input: {
  teamId: string;
  organizationId: string;
  eventId: string;
  reason: string;
}): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: existingCaptain } = await supabase
    .from("players")
    .select("id")
    .eq("team_id", input.teamId)
    .eq("is_captain", true)
    .is("left_at", null)
    .maybeSingle();

  if (existingCaptain) return existingCaptain.id;

  const { data: nextPlayer, error } = await supabase
    .from("players")
    .select("id, display_name")
    .eq("team_id", input.teamId)
    .is("left_at", null)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!nextPlayer) return null;

  const { error: promoteError } = await supabase
    .from("players")
    .update({ is_captain: true, role: "alpha" })
    .eq("id", nextPlayer.id);

  if (promoteError) throw new Error(promoteError.message);

  await setTeamNavigator(input.teamId, nextPlayer.id);

  await writeAuditLog({
    organizationId: input.organizationId,
    eventId: input.eventId,
    teamId: input.teamId,
    playerId: nextPlayer.id,
    action: "captain_auto_promoted",
    payload: { reason: input.reason, display_name: nextPlayer.display_name },
  });

  return nextPlayer.id;
}

export async function syncTeamLeadershipAfterPlayerLeaves(input: {
  teamId: string;
  organizationId: string;
  eventId: string;
  playerId: string;
  wasCaptain: boolean;
  wasNavigator: boolean;
}): Promise<void> {
  if (input.wasCaptain) {
    await promoteNextCaptain({
      teamId: input.teamId,
      organizationId: input.organizationId,
      eventId: input.eventId,
      reason: "captain_left_team",
    });
  } else if (input.wasNavigator) {
    await promoteNextNavigator({
      teamId: input.teamId,
      organizationId: input.organizationId,
      eventId: input.eventId,
      reason: "navigator_left_team",
      excludePlayerId: input.playerId,
    });
  }

  await rebalanceArchetypeRoles(input.teamId);
}
