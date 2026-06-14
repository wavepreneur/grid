import { notFound } from "next/navigation";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import { GridShell } from "@/components/grid/grid-shell";
import { LobbyGate } from "@/components/lobby/lobby-gate";

type LobbyPageProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
};

export default async function LobbyPage({ params }: LobbyPageProps) {
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
      title="Team-Lobby"
      description={`${eventResult.data.title} · Team ${teamResult.data.teamName}`}
    >
      <LobbyGate
        inviteCode={normalizedInviteCode}
        joinCode={normalizedJoinCode}
      />
    </GridShell>
  );
}
