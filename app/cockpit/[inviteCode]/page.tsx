import { notFound } from "next/navigation";
import { getEventByInviteCode } from "@/lib/grid/session-auth";
import { EventCockpit } from "@/components/cockpit/event-cockpit";
import { normalizeCode } from "@/lib/grid/codes";

type CockpitPageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function CockpitPage({ params }: CockpitPageProps) {
  const { inviteCode } = await params;
  const normalized = normalizeCode(inviteCode);
  const event = await getEventByInviteCode(normalized);

  if (!event) {
    notFound();
  }

  return (
    <div className="grid-bg min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--grid-accent)]">
            GRID / Event Cockpit
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{event.title}</h1>
          <p className="text-sm leading-7 text-[var(--grid-muted)]">
            Operator-Ansicht für Event-Leiter: Live-Stand, GPS eingreifen, Team Lead (GPS) setzen.
            Der Invite-Code ist euer Zugangsschlüssel.
          </p>
        </header>

        <section className="grid-panel p-6 sm:p-8">
          <EventCockpit inviteCode={normalized} />
        </section>
      </div>
    </div>
  );
}
