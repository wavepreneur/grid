import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/grid/audit-log";
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
  player: Pick<ActivePlayer, "id" | "session_id" | "display_name" | "is_captain">;
  teamId: string;
  joinCode: string;
  inviteCode: string;
  teamStatus: GridTeamStatus;
  navigatorPlayerId: string | null;
}): PlayerSession {
  return {
    playerId: input.player.id,
    sessionId: input.player.session_id,
    displayName: input.player.display_name,
    teamId: input.teamId,
    joinCode: input.joinCode,
    inviteCode: input.inviteCode,
    isCaptain: input.player.is_captain,
    isNavigator: input.navigatorPlayerId === input.player.id,
    teamStatus: input.teamStatus,
  };
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
    .select("navigator_player_id")
    .eq("id", input.teamId)
    .single();

  if (team?.navigator_player_id) {
    const { data: activeNavigator } = await supabase
      .from("players")
      .select("id")
      .eq("id", team.navigator_player_id)
      .eq("team_id", input.teamId)
      .is("left_at", null)
      .maybeSingle();

    if (activeNavigator && activeNavigator.id !== input.excludePlayerId) {
      return activeNavigator.id;
    }
  }

  let query = supabase
    .from("players")
    .select("id, display_name")
    .eq("team_id", input.teamId)
    .is("left_at", null)
    .order("joined_at", { ascending: true })
    .limit(1);

  if (input.excludePlayerId) {
    query = query.neq("id", input.excludePlayerId);
  }

  const { data: nextPlayer, error } = await query.maybeSingle();
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
    payload: {
      reason: input.reason,
      display_name: nextPlayer.display_name,
    },
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
    .update({ is_captain: true, role: "captain" })
    .eq("id", nextPlayer.id);

  if (promoteError) throw new Error(promoteError.message);

  await writeAuditLog({
    organizationId: input.organizationId,
    eventId: input.eventId,
    teamId: input.teamId,
    playerId: nextPlayer.id,
    action: "captain_auto_promoted",
    payload: {
      reason: input.reason,
      display_name: nextPlayer.display_name,
    },
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
  }

  if (input.wasNavigator) {
    await promoteNextNavigator({
      teamId: input.teamId,
      organizationId: input.organizationId,
      eventId: input.eventId,
      reason: "navigator_left_team",
      excludePlayerId: input.playerId,
    });
  }
}
