import { notFound } from "next/navigation";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import { GridShell } from "@/components/grid/grid-shell";
import { LobbyGate } from "@/components/lobby/lobby-gate";

type EventLobbyPageProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
  searchParams: Promise<{ manage?: string }>;
};

export default async function EventLobbyPage({ params, searchParams }: EventLobbyPageProps) {
  const { inviteCode, joinCode } = await params;
  const { manage } = await searchParams;
  const normalizedInvite = inviteCode.toUpperCase();
  const normalizedJoin = joinCode.toUpperCase();
  const manageMode = manage === "1" || manage === "true";

  const eventResult = await getEventInvite(normalizedInvite);
  if (!eventResult.success) notFound();

  const teamResult = await resolveTeamJoinCode({
    inviteCode: normalizedInvite,
    joinCode: normalizedJoin,
  });
  if (!teamResult.success) notFound();

  return (
    <GridShell
      title={manageMode ? "Team verwalten" : "Team-Lobby"}
      description={`${eventResult.data.title} · ${teamResult.data.teamName}`}
    >
      <LobbyGate
        inviteCode={normalizedInvite}
        joinCode={normalizedJoin}
        manageMode={manageMode}
      />
    </GridShell>
  );
}
