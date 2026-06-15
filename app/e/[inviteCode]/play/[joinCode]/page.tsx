import { notFound } from "next/navigation";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import { GameGate } from "@/components/game/game-gate";
import { GameShell } from "@/components/game/game-shell";

type EventPlayPageProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
};

export default async function EventPlayPage({ params }: EventPlayPageProps) {
  const { inviteCode, joinCode } = await params;
  const normalizedInvite = inviteCode.toUpperCase();
  const normalizedJoin = joinCode.toUpperCase();

  const eventResult = await getEventInvite(normalizedInvite);
  if (!eventResult.success) notFound();

  const teamResult = await resolveTeamJoinCode({
    inviteCode: normalizedInvite,
    joinCode: normalizedJoin,
  });
  if (!teamResult.success) notFound();

  return (
    <GameShell
      title={eventResult.data.title}
      description={`Team ${teamResult.data.teamName}`}
    >
      <GameGate
        inviteCode={normalizedInvite}
        joinCode={normalizedJoin}
        teamName={teamResult.data.teamName}
        eventTitle={eventResult.data.title}
      />
    </GameShell>
  );
}
