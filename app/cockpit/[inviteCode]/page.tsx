import { notFound } from "next/navigation";
import { getEventByInviteCode } from "@/lib/grid/session-auth";
import { EventCockpit } from "@/components/cockpit/event-cockpit";
import { CockpitShell } from "@/components/cockpit/cockpit-shell";
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
    <CockpitShell
      title={event.title}
      description="Live-Übersicht für Event-Leiter: Teams verfolgen, GPS steuern und Team-Leiter zuweisen."
    >
      <EventCockpit inviteCode={normalized} />
    </CockpitShell>
  );
}
