import { notFound, redirect } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import { GridShell } from "@/components/grid/grid-shell";
import { CaptainSetupForm } from "@/components/lobby/captain-setup-form";
import { isStudioTestEvent } from "@/lib/cms/studio-test-session";
import { eventLobbyPath, eventPath, eventTeamJoinPath } from "@/lib/grid/event-routes";
import Link from "next/link";

type EventCaptainPageProps = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ team?: string }>;
};

export default async function EventCaptainPage({ params, searchParams }: EventCaptainPageProps) {
  const { inviteCode } = await params;
  const { team: teamCode } = await searchParams;
  const normalizedInvite = inviteCode.toUpperCase();
  const normalizedJoin = teamCode?.toUpperCase();

  const eventResult = await getEventInvite(normalizedInvite);
  if (!eventResult.success) notFound();

  const studioTest = isStudioTestEvent(eventResult.data);

  // Prebooked / Studio-Test link with join code: once the lead finished setup,
  // teammates must land on the join form (name only) — not captain setup again.
  if (normalizedJoin) {
    const teamResult = await resolveTeamJoinCode({
      inviteCode: normalizedInvite,
      joinCode: normalizedJoin,
    });
    if (teamResult.success && teamResult.data.teamStatus !== "setup") {
      if (studioTest && teamResult.data.teamStatus !== "finished") {
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
    <GridShell
      variant="welcome"
      eyebrow={studioTest ? "Testspiel" : "Willkommen"}
      title={gameTitle}
      description="Legt euren Teamnamen und deinen Namen fest — dann geht’s in den Wartebereich."
      logoUrl={content?.logoUrl}
    >
      <CaptainSetupForm
        inviteCode={normalizedInvite}
        joinCode={normalizedJoin}
        studioTest={studioTest}
        maxPlayersPerTeam={eventResult.data.max_players_per_team}
      />
      {!studioTest ? (
        <p className="mt-5 text-center text-xs text-slate-400">
          <Link href={eventPath(normalizedInvite)} className="text-teal-700 hover:underline">
            ← Zurück
          </Link>
        </p>
      ) : null}
    </GridShell>
  );
}
