import { createAdminClient } from "@/lib/supabase/admin";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import { parseTeamGameState } from "@/lib/grid/game-state";
import { loadPortalEventByToken } from "@/lib/grid/portal";

export type EventResultsLevel = {
  level: number;
  title: string;
};

export type EventResultsTeam = {
  id: string;
  name: string;
  status: string;
  score: number;
  current_level: number;
  player_count: number;
  captain_name: string | null;
  finished_at: string | null;
  done_levels: number[];
};

export type EventResultsSnapshot = {
  invite_code: string;
  title: string;
  status: string;
  levels: EventResultsLevel[];
  teams: EventResultsTeam[];
};

export function completedLevelNumbers(gameState: unknown, levelNumbers: number[]): number[] {
  const parsed = parseTeamGameState(gameState);
  return levelNumbers.filter((level) => parsed.levels[String(level)]?.status === "completed");
}

export async function loadEventResultsByPortalToken(
  token: string,
): Promise<EventResultsSnapshot | null> {
  const event = await loadPortalEventByToken(token);
  if (!event) return null;
  return loadEventResultsForEvent(event);
}

async function loadEventResultsForEvent(event: {
  id: string;
  title: string;
  status: string;
  invite_code: string;
  organization_id: string;
  city_id: string | null;
  content_config: unknown;
  route_override: unknown;
  studio_game_version_id: string | null;
}): Promise<EventResultsSnapshot> {
  const content = await loadResolvedEventContent({
    eventId: event.id,
    organizationId: event.organization_id,
    cityId: event.city_id,
    contentConfig: event.content_config,
    routeOverride: event.route_override,
    studioGameVersionId: event.studio_game_version_id,
  });

  const levels: EventResultsLevel[] = content.levels.map((level) => ({
    level: level.level,
    title: level.title,
  }));
  const levelNumbers = levels.map((level) => level.level);

  const supabase = createAdminClient();
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, status, current_level, game_state, finished_at, captain_player_id")
    .eq("event_id", event.id)
    .neq("status", "disbanded")
    .order("join_code", { ascending: true });

  if (error) throw new Error(error.message);

  const teamRows = teams ?? [];
  const teamIds = teamRows.map((team) => team.id);
  const { data: players } = teamIds.length
    ? await supabase
        .from("players")
        .select("id, team_id, display_name, is_captain, left_at")
        .in("team_id", teamIds)
        .is("left_at", null)
    : { data: [] };

  const playersByTeam = new Map<string, typeof players>();
  for (const player of players ?? []) {
    const list = playersByTeam.get(player.team_id) ?? [];
    list.push(player);
    playersByTeam.set(player.team_id, list);
  }

  const resultTeams: EventResultsTeam[] = teamRows.map((team) => {
    const teamPlayers = playersByTeam.get(team.id) ?? [];
    const gameState = parseTeamGameState(team.game_state);
    return {
      id: team.id,
      name: team.name,
      status: team.status,
      score: gameState.score ?? 0,
      current_level: team.current_level ?? 0,
      player_count: teamPlayers.length,
      captain_name:
        teamPlayers.find((player) => player.is_captain)?.display_name ??
        teamPlayers.find((player) => player.id === team.captain_player_id)?.display_name ??
        null,
      finished_at: team.finished_at,
      done_levels: completedLevelNumbers(team.game_state, levelNumbers),
    };
  });

  resultTeams.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name, "de");
  });

  return {
    invite_code: event.invite_code,
    title: event.title,
    status: event.status,
    levels,
    teams: resultTeams,
  };
}
