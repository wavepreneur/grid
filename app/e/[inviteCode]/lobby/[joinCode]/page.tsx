import { notFound } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import { GridShell } from "@/components/grid/grid-shell";
import { LobbyGate } from "@/components/lobby/lobby-gate";
import { isStudioTestEvent, needsBriefingBeforePlay } from "@/lib/cms/studio-test-session";

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
  const studioPlaytest = isStudioTestEvent(eventResult.data);
  const title = eventResult.data.title.replace(/^\[Test\]\s*/, "");
  const contentResult = await getEventContent(normalizedInvite);
  const content = contentResult.success ? contentResult.data : null;

  return (
    <GridShell
      variant="welcome"
      eyebrow={manageMode ? "Team" : "Bereit machen"}
      title={title}
      description={
        manageMode
          ? `Team ${teamResult.data.teamName}`
          : "Spielregeln lesen — dann starten."
      }
      logoUrl={content?.logoUrl}
    >
      <LobbyGate
        inviteCode={normalizedInvite}
        joinCode={normalizedJoin}
        manageMode={manageMode}
        eventTitle={title}
        briefingIframeUrl={content?.briefingIframeUrl ?? null}
        studioTest={holdForBriefing}
        studioPlaytest={studioPlaytest}
        eventContent={content}
      />
    </GridShell>
  );
}
