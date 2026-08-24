import { notFound } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
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

  const contentResult = await getEventContent(normalizedInvite);
  const content = contentResult.success ? contentResult.data : null;

  return (
    <GridShell
      variant="welcome"
      eyebrow={manageMode ? "Team" : "Wartebereich"}
      title={content?.templateName?.trim() || eventResult.data.title}
      description={
        manageMode
          ? `Team ${teamResult.data.teamName}`
          : "Lest die Kurzinformationen und holt eure Mitspieler dazu."
      }
      logoUrl={content?.logoUrl}
    >
      <LobbyGate
        inviteCode={normalizedInvite}
        joinCode={normalizedJoin}
        manageMode={manageMode}
        eventTitle={content?.templateName?.trim() || eventResult.data.title}
        briefingIframeUrl={content?.briefingIframeUrl}
        roleLabels={content?.roleLabels}
      />
    </GridShell>
  );
}
