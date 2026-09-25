import { GameGate } from "@/components/game/game-gate";
import { resolveTeamJoinCode } from "@/app/actions/lobby";
import { needsBriefingBeforePlay } from "@/lib/cms/studio-test-session";
import { getEventByInviteCode } from "@/lib/grid/session-auth";

type EventPlayPageProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
};

export default async function EventPlayPage({ params }: EventPlayPageProps) {
  const { inviteCode, joinCode } = await params;
  const invite = inviteCode.toUpperCase();
  const join = joinCode.toUpperCase();
  const [event, teamResult] = await Promise.all([
    getEventByInviteCode(invite),
    resolveTeamJoinCode({ inviteCode: invite, joinCode: join }),
  ]);

  return (
    <GameGate
      inviteCode={invite}
      joinCode={join}
      teamName={teamResult.success ? teamResult.data.teamName : ""}
      eventTitle="Mission"
      holdForBriefing={event ? needsBriefingBeforePlay(event) : false}
    />
  );
}
