import { notFound } from "next/navigation";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import { GridShell } from "@/components/grid/grid-shell";
import { LobbyGate } from "@/components/lobby/lobby-gate";
import { needsBriefingBeforePlay } from "@/lib/cms/studio-test-session";

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

  const holdForBriefing = needsBriefingBeforePlay(eventResult.data);
  const title = eventResult.data.title.replace(/^\[Test\]\s*/, "");

  return (
    <GridShell
      variant="welcome"
      eyebrow={manageMode ? "Team" : "Bereit machen"}
      title={title}
      description={
        manageMode
          ? `Team ${teamResult.data.teamName}`
          : "Kurzinformationen lesen — dann starten."
      }
    >
      <LobbyGate
        inviteCode={normalizedInvite}
        joinCode={normalizedJoin}
        manageMode={manageMode}
        eventTitle={title}
        studioTest={holdForBriefing}
      />
    </GridShell>
  );
}
