import { notFound } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
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
  const contentResult = await getEventContent(normalized);
  const content = contentResult.success ? contentResult.data : null;
  const title = content?.templateName?.trim() || event.title;

  return (
    <GridShell
      variant="welcome"
      eyebrow="Willkommen"
      title={title}
      description="Kein Login nötig — wählt euer Team und legt los."
      logoUrl={content?.logoUrl}
    >
      <EventLanding event={event} />
      <p className="mt-6 text-center text-xs text-slate-400">
        Event-Leiter?{" "}
        <Link href={cockpitPath(normalized)} className="font-medium text-teal-700 hover:underline">
          Cockpit
        </Link>
      </p>
    </GridShell>
  );
}
