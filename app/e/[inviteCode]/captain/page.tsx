import { notFound, redirect } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import { CaptainStartFlow } from "@/components/lobby/captain-start-flow";
import { isStudioTestEvent, needsBriefingBeforePlay } from "@/lib/cms/studio-test-session";
import { eventLobbyPath, eventTeamJoinPath } from "@/lib/grid/event-routes";

type EventCaptainPageProps = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ team?: string }>;
};

function eventLanguage(contentConfig: unknown): string | null {
  if (!contentConfig || typeof contentConfig !== "object") return null;
  const value = (contentConfig as { language?: unknown }).language;
  return typeof value === "string" ? value : null;
}

export default async function EventCaptainPage({ params, searchParams }: EventCaptainPageProps) {
  const { inviteCode } = await params;
  const { team: teamCode } = await searchParams;
  const normalizedInvite = inviteCode.toUpperCase();
  const normalizedJoin = teamCode?.toUpperCase();

  const eventResult = await getEventInvite(normalizedInvite);
  if (!eventResult.success) notFound();

  const studioTest = isStudioTestEvent(eventResult.data);
  const holdForBriefing = needsBriefingBeforePlay(eventResult.data);

  // Prebooked / Studio-Test / GRID-Pilot: after names, the lead stays in the
  // start room. Teammates of live games still use the join form.
  if (normalizedJoin) {
    const teamResult = await resolveTeamJoinCode({
      inviteCode: normalizedInvite,
      joinCode: normalizedJoin,
    });
    if (teamResult.success && teamResult.data.teamStatus !== "setup") {
      if (
        teamResult.data.teamStatus === "lobby" ||
        (holdForBriefing && teamResult.data.teamStatus !== "finished")
      ) {
        redirect(eventLobbyPath(normalizedInvite, teamResult.data.joinCode));
      } else {
        redirect(eventTeamJoinPath(normalizedInvite, teamResult.data.joinCode));
      }
    }
  }

  const contentResult = await getEventContent(normalizedInvite);
  const content = contentResult.success ? contentResult.data : null;
  const gameTitle = content?.templateName?.trim() || eventResult.data.title;

  return (
    <CaptainStartFlow
      inviteCode={normalizedInvite}
      joinCode={normalizedJoin}
      studioTest={studioTest}
      maxPlayersPerTeam={eventResult.data.max_players_per_team}
      eventContent={content}
      gameTitle={gameTitle}
      language={eventLanguage(eventResult.data.content_config)}
    />
  );
}
