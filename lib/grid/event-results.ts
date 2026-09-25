import { createAdminClient } from "@/lib/supabase/admin";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import { levelPlayOutcome, parseTeamGameState, type TeamGameState } from "@/lib/grid/game-state";
import { loadPortalEventByToken } from "@/lib/grid/portal";

export type EventResultsLevel = {
  level: number;
  title: string;
};

export type EventResultsTeam = {
  id: string;
  join_code: string;
  name: string;
  status: string;
  score: number;
  current_level: number;
  player_count: number;
  captain_name: string | null;
  finished_at: string | null;
  done_levels: number[];
  revealed_levels: number[];
  solved_count: number;
  hints_count: number;
  bonuses_solved: number;
  total_levels: number;
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

export function revealedLevelNumbers(gameState: unknown, levelNumbers: number[]): number[] {
  const parsed = parseTeamGameState(gameState);
  return levelNumbers.filter((level) => levelPlayOutcome(parsed.levels[String(level)]) === "revealed");
}

export function countPurchasedHints(gameState: TeamGameState): number {
  let count = 0;
  for (const byTile of Object.values(gameState.purchased_tile_hints ?? {})) {
    count += Object.keys(byTile ?? {}).length;
  }
  for (const byHint of Object.values(gameState.purchased_level_hints ?? {})) {
    count += Object.keys(byHint ?? {}).length;
  }
  count += (gameState.wallet ?? []).filter((note) => Boolean(note.purchased_by)).length;
  return count;
}

export function countSolvedBonuses(gameState: TeamGameState): number {
  const ids = new Set<string>();
  for (const [id, session] of Object.entries(gameState.bonus_sessions ?? {})) {
    if (session.reveal?.correct) ids.add(session.bonus_id || id);
  }
  for (const item of gameState.bonus_queue ?? []) {
    if (item.status === "done") ids.add(item.bonus_id);
  }
  return ids.size;
}

export async function loadEventResultsByPortalToken(
  token: string,
): Promise<EventResultsSnapshot | null> {
  const event = await loadPortalEventByToken(token);
  if (!event) return null;
  return loadEventResultsForEvent(event);
}

export async function loadEventResultsForEvent(event: {
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
    .select("id, join_code, name, status, current_level, game_state, finished_at, captain_player_id")
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
    const done = completedLevelNumbers(team.game_state, levelNumbers);
    const revealed = revealedLevelNumbers(team.game_state, levelNumbers);
    return {
      id: team.id,
      join_code: String(team.join_code ?? "").toUpperCase(),
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
      done_levels: done,
      revealed_levels: revealed,
      solved_count: Math.max(0, done.length - revealed.length),
      hints_count: countPurchasedHints(gameState),
      bonuses_solved: countSolvedBonuses(gameState),
      total_levels: levelNumbers.length,
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
