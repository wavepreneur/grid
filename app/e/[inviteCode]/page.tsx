import { notFound } from "next/navigation";
import { getEventInvite } from "@/app/actions/lobby";
import { EventLanding } from "@/components/event/event-landing";
import { GridShell } from "@/components/grid/grid-shell";
import { cockpitPath } from "@/lib/grid/event-routes";
import Link from "next/link";

type EventPageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { inviteCode } = await params;
  const normalized = inviteCode.toUpperCase();
  const eventResult = await getEventInvite(normalized);

  if (!eventResult.success) {
    notFound();
  }

  const event = eventResult.data;

  return (
    <GridShell
      eyebrow="Willkommen"
      title={event.title}
      description={
        event.organization_name
          ? `${event.organization_name} · Tippe deinen Namen — kein Passwort nötig.`
          : "Tippe deinen Namen — kein Passwort nötig."
      }
    >
      <EventLanding event={event} />
      <p className="mt-8 text-center text-xs text-[var(--grid-muted)]">
        Event-Leiter?{" "}
        <Link href={cockpitPath(normalized)} className="text-emerald-300 hover:underline">
          Operator-Cockpit öffnen
        </Link>
      </p>
    </GridShell>
  );
}
