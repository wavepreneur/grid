import { notFound } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import { GridLink, GridShell } from "@/components/grid/grid-shell";
import { TeamEntryGate } from "@/components/lobby/team-entry-gate";
import { eventPath } from "@/lib/grid/event-routes";

type EventTeamPageProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
  searchParams: Promise<{ name?: string }>;
};

export default async function EventTeamPage({ params, searchParams }: EventTeamPageProps) {
  const { inviteCode, joinCode } = await params;
  const { name } = await searchParams;
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

  if (!teamResult.success) {
    return (
      <GridShell
        variant="welcome"
        title="Team nicht gefunden"
        description="Der Code passt nicht — frag dein Team nach dem richtigen Link."
      >
        <GridLink href={eventPath(normalizedInvite)}>Zurück zum Event</GridLink>
      </GridShell>
    );
  }

  const midGame = teamResult.data.teamStatus === "playing";

  return (
    <GridShell
      variant="welcome"
      eyebrow={midGame ? "Weiterspielen" : "Willkommen"}
      title={gameTitle}
      description={`Team ${teamResult.data.teamName}`}
      logoUrl={content?.logoUrl}
    >
      <TeamEntryGate
        inviteCode={normalizedInvite}
        joinCode={teamResult.data.joinCode}
        teamName={teamResult.data.teamName}
        teamStatus={teamResult.data.teamStatus}
        defaultDisplayName={name?.trim() ?? ""}
      />
    </GridShell>
  );
}
