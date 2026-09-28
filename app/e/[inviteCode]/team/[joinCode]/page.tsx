import { notFound } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import { GridLink, GridShell } from "@/components/grid/grid-shell";
import { TeamEntryGate } from "@/components/lobby/team-entry-gate";
import { needsBriefingBeforePlay } from "@/lib/cms/studio-test-session";
import { eventPath } from "@/lib/grid/event-routes";
import { playUi } from "@/lib/grid/play-ui";

type EventTeamPageProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
  searchParams: Promise<{ name?: string; rejoin?: string }>;
};

export default async function EventTeamPage({ params, searchParams }: EventTeamPageProps) {
  const { inviteCode, joinCode } = await params;
  const { name, rejoin } = await searchParams;
  const normalizedInvite = inviteCode.toUpperCase();
  const normalizedJoin = joinCode.toUpperCase();

  const eventResult = await getEventInvite(normalizedInvite);
  if (!eventResult.success) notFound();

  const teamResult = await resolveTeamJoinCode({
    inviteCode: normalizedInvite,
    joinCode: normalizedJoin,
  });

  const contentResult = await getEventContent(normalizedInvite);
  const content = contentResult.success ? contentResult.data : null;
  const gameTitle = content?.templateName?.trim() || eventResult.data.title;
  const t = playUi(content?.language);

  if (!teamResult.success) {
    return (
      <GridShell
        variant="welcome"
        title={t.joinPage.notFoundTitle}
        description={t.joinPage.notFoundBody}
      >
        <GridLink href={eventPath(normalizedInvite)}>{t.joinPage.backToEvent}</GridLink>
      </GridShell>
    );
  }

  const studioTest = needsBriefingBeforePlay(eventResult.data) || Boolean(content?.holdForBriefing);

  const midGame = teamResult.data.teamStatus === "playing";
  const captainName = teamResult.data.captainDisplayName;
  const shellDescription = midGame
    ? t.lobbyPage.teamPrefix(teamResult.data.teamName)
    : captainName
      ? t.joinPage.inviteFrom(captainName, teamResult.data.teamName)
      : t.joinPage.joinTeam(teamResult.data.teamName);

  return (
    <GridShell
      variant="welcome"
      eyebrow={midGame ? t.joinPage.playingEyebrow : t.joinPage.inviteEyebrow}
      title={gameTitle}
      description={shellDescription}
      logoUrl={content?.logoUrl}
    >
      <TeamEntryGate
        inviteCode={normalizedInvite}
        joinCode={teamResult.data.joinCode}
        teamName={teamResult.data.teamName}
        teamStatus={teamResult.data.teamStatus}
        captainDisplayName={captainName}
        defaultDisplayName={name?.trim() ?? ""}
        studioTest={studioTest}
        skipStoredSession={rejoin === "1"}
        eventContent={content}
        language={content?.language}
      />
    </GridShell>
  );
}
