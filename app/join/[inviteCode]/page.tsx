import { notFound } from "next/navigation";
import { getEventInvite, resolveTeamJoinCode } from "@/app/actions/lobby";
import {
  GridLink,
  GridShell,
} from "@/components/grid/grid-shell";
import { TeamEntryGate } from "@/components/lobby/team-entry-gate";
import { TeamCodeEntry } from "@/components/lobby/team-code-entry";
import Link from "next/link";

type JoinPageProps = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ team?: string; name?: string }>;
};

export default async function JoinPage({ params, searchParams }: JoinPageProps) {
  const { inviteCode } = await params;
  const { team, name } = await searchParams;
  const normalizedInviteCode = inviteCode.toUpperCase();
  const defaultDisplayName = name?.trim() ?? "";

  const eventResult = await getEventInvite(normalizedInviteCode);
  if (!eventResult.success) {
    notFound();
  }

  const event = eventResult.data;

  if (team) {
    const teamResult = await resolveTeamJoinCode({
      inviteCode: normalizedInviteCode,
      joinCode: team,
    });

    if (!teamResult.success) {
      return (
        <GridShell
          title="Team nicht gefunden"
          description="Der Team-Code ist ungültig oder gehört nicht zu diesem Event."
        >
          <GridLink href={`/join/${normalizedInviteCode}`}>
            Zurück zum Event
          </GridLink>
        </GridShell>
      );
    }

    return (
      <GridShell
        title={teamResult.data.teamStatus === "playing" ? "Spiel beitreten" : "Lobby beitreten"}
        description={`Event: ${event.title}`}
      >
        <TeamEntryGate
          inviteCode={normalizedInviteCode}
          joinCode={teamResult.data.joinCode}
          teamName={teamResult.data.teamName}
          teamStatus={teamResult.data.teamStatus}
          defaultDisplayName={defaultDisplayName}
        />
      </GridShell>
    );
  }

  return (
    <GridShell
      title={event.title}
      description={
        event.organization_name
          ? `${event.organization_name} · Event-Code ${event.invite_code}`
          : `Event-Code ${event.invite_code}`
      }
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
            Als erstes Team (Captain)
          </p>
          <Link
            href={`/join/${normalizedInviteCode}/captain`}
            className="grid-button inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
          >
            Team erstellen
          </Link>
        </div>

        <div className="border-t border-[var(--grid-border)] pt-8">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
            Teammate mit Team-Code
          </p>
          <TeamCodeEntry inviteCode={normalizedInviteCode} />
        </div>
      </div>
    </GridShell>
  );
}
