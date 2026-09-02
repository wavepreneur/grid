import { notFound } from "next/navigation";
import { getEventByInviteCode } from "@/lib/grid/session-auth";
import { EventCockpit } from "@/components/cockpit/event-cockpit";
import { StudioPage } from "@/components/cms/studio-page";
import { BackofficeFrame } from "@/components/platform/backoffice-frame";
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
    <BackofficeFrame>
      <StudioPage
        eyebrow="GRID Cockpit"
        title={event.title}
        description="Live-Übersicht für Event-Leiter: Teams, Health-Engine und Legacy-GPS. Der Beamer bleibt ohne Sidebar unter /show."
      >
        <EventCockpit inviteCode={normalized} />
      </StudioPage>
    </BackofficeFrame>
  );
}
