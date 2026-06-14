import { notFound } from "next/navigation";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import { GameGate } from "@/components/game/game-gate";
import { GridShell } from "@/components/grid/grid-shell";

type PlayPageProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
};

export default async function PlayPage({ params }: PlayPageProps) {
  const { inviteCode, joinCode } = await params;
  const normalizedInviteCode = inviteCode.toUpperCase();
  const normalizedJoinCode = joinCode.toUpperCase();

  const eventResult = await getEventInvite(normalizedInviteCode);
  if (!eventResult.success) {
    notFound();
  }

  const teamResult = await resolveTeamJoinCode({
    inviteCode: normalizedInviteCode,
    joinCode: normalizedJoinCode,
  });

  if (!teamResult.success) {
    notFound();
  }

  return (
    <GridShell
      title="Exitmania Demo"
      description={`${eventResult.data.title} · Team ${teamResult.data.teamName}`}
    >
      <GameGate
        inviteCode={normalizedInviteCode}
        joinCode={normalizedJoinCode}
        teamName={teamResult.data.teamName}
      />
    </GridShell>
  );
}
