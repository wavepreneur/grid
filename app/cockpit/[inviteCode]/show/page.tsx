import { notFound } from "next/navigation";
import { getEventByInviteCode } from "@/lib/tells/session-auth";
import { EventCockpitShow } from "@/components/cockpit/event-cockpit-show";
import { normalizeCode } from "@/lib/tells/codes";

type CockpitShowPageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function CockpitShowPage({ params }: CockpitShowPageProps) {
  const { inviteCode } = await params;
  const normalized = normalizeCode(inviteCode);
  const event = await getEventByInviteCode(normalized);

  if (!event) notFound();

  return <EventCockpitShow inviteCode={normalized} />;
}
