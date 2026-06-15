import { notFound } from "next/navigation";
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

  if (!teamResult.success) {
    return (
      <GridShell title="Team nicht gefunden" description="Der Team-Code passt nicht zu diesem Event.">
        <GridLink href={eventPath(normalizedInvite)}>Zurück zum Event</GridLink>
      </GridShell>
    );
  }

  return (
    <GridShell
      title={teamResult.data.teamStatus === "playing" ? "Weiterspielen" : "Team beitreten"}
      description={`${eventResult.data.title} · Team ${teamResult.data.teamName}`}
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
