import { notFound } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
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

  const contentConfig = eventResult.data.content_config as
    | Record<string, unknown>
    | null
    | undefined;
  const studioTest = Boolean(contentConfig?.is_studio_test);

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
