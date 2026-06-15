import { notFound } from "next/navigation";
import { getEventInvite } from "@/app/actions/lobby";
import { GridShell } from "@/components/grid/grid-shell";
import { CaptainSetupForm } from "@/components/lobby/captain-setup-form";
import { eventPath } from "@/lib/grid/event-routes";
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

  return (
    <GridShell
      title="Team erstellen"
      description={
        normalizedJoin
          ? `Captain für Team ${normalizedJoin} · ${eventResult.data.title}`
          : `Starte das erste Team für „${eventResult.data.title}".`
      }
    >
      <CaptainSetupForm inviteCode={normalizedInvite} joinCode={normalizedJoin} />
      <p className="mt-6 text-center text-xs text-[var(--grid-muted)]">
        <Link href={eventPath(normalizedInvite)} className="hover:text-white">
          ← Zurück zum Event
        </Link>
      </p>
    </GridShell>
  );
}
