import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import { parseTeamGameState, type TeamGameState } from "@/lib/grid/game-state";
import { getEventByInviteCode, getTeamByJoinCode } from "@/lib/grid/session-auth";
import { normalizeCode } from "@/lib/grid/codes";
import type { ResolvedEventContent } from "@/lib/grid/level-types";

export type PublicTeamRecap = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
  score: number;
  gameState: TeamGameState;
  eventContent: ResolvedEventContent;
};

export async function loadPublicTeamRecap(
  inviteCode: string,
  joinCode: string,
): Promise<PublicTeamRecap | null> {
  const invite = normalizeCode(inviteCode);
  const join = normalizeCode(joinCode);
  const event = await getEventByInviteCode(invite);
  if (!event) return null;

  const team = await getTeamByJoinCode(join, event.id);
  if (!team || team.status !== "finished") return null;

  const eventContent = await loadResolvedEventContent({
    eventId: event.id,
    organizationId: event.organization_id,
    cityId: event.city_id,
    contentConfig: event.content_config,
    routeOverride: event.route_override,
    studioGameVersionId: event.studio_game_version_id,
  });
  const gameState = parseTeamGameState(team.game_state);

  return {
    inviteCode: invite,
    joinCode: join,
    teamName: typeof team.name === "string" && team.name.trim() ? team.name.trim() : "Team",
    score: gameState.score ?? 0,
    gameState,
    eventContent,
  };
}
