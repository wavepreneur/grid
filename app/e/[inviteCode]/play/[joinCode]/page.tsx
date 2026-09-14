import { redirect } from "next/navigation";
import { GameGate } from "@/components/game/game-gate";
import { studioNeedsBriefing } from "@/lib/cms/studio-test-session";
import { eventLobbyPath } from "@/lib/grid/event-routes";
import { parseTeamGameState } from "@/lib/grid/game-state";
import { getEventByInviteCode, getTeamByJoinCode } from "@/lib/grid/session-auth";

type EventPlayPageProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
};

export default async function EventPlayPage({ params }: EventPlayPageProps) {
  const { inviteCode, joinCode } = await params;
  const invite = inviteCode.toUpperCase();
  const join = joinCode.toUpperCase();

  const event = await getEventByInviteCode(invite);
  if (event) {
    const team = await getTeamByJoinCode(join, event.id);
    const briefingConfirmed = parseTeamGameState(team?.game_state).briefing_confirmed === true;
    if (
      studioNeedsBriefing({
        event,
        teamStatus: team?.status,
        briefingConfirmed,
      })
    ) {
      redirect(eventLobbyPath(invite, join));
    }
  }

  return (
    <GameGate
      inviteCode={invite}
      joinCode={join}
      teamName=""
      eventTitle="Mission"
    />
  );
}
