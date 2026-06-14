import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/grid/codes";

export async function getEventByInviteCode(inviteCode: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, organization_name, invite_code, status, max_teams, max_players_per_team, lobby_auto_start_seconds",
    )
    .eq("invite_code", normalizeCode(inviteCode))
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getTeamByJoinCode(joinCode: string, eventId: string) {
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

export async function getPlayerBySessionId(sessionId: string) {
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

export async function assertPlayerSession(input: {
  sessionId: string;
  inviteCode: string;
  joinCode: string;
}) {
  const event = await getEventByInviteCode(input.inviteCode);
  if (!event) {
    throw new Error("Event nicht gefunden.");
  }

  const team = await getTeamByJoinCode(input.joinCode, event.id);
  if (!team) {
    throw new Error("Team nicht gefunden.");
  }

  const player = await getPlayerBySessionId(input.sessionId);
  if (!player || player.team_id !== team.id) {
    throw new Error("Session ungültig.");
  }

  return { event, team, player };
}
