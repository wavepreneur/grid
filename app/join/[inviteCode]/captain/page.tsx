import { notFound } from "next/navigation";
import { getEventInvite } from "@/app/actions/lobby";
import { GridShell } from "@/components/grid/grid-shell";
import { CaptainSetupForm } from "@/components/lobby/captain-setup-form";

type CaptainPageProps = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ team?: string }>;
};

export default async function CaptainPage({ params, searchParams }: CaptainPageProps) {
  const { inviteCode } = await params;
  const { team: teamCode } = await searchParams;
  const normalizedInviteCode = inviteCode.toUpperCase();
  const normalizedJoinCode = teamCode?.toUpperCase();

  const eventResult = await getEventInvite(normalizedInviteCode);

  if (!eventResult.success) {
    notFound();
  }

  return (
    <GridShell
      title="Captain Setup"
      description={
        normalizedJoinCode
          ? `Konfiguriere vorgebuchtes Team ${normalizedJoinCode} für „${eventResult.data.title}".`
          : `Erstelle dein Team für „${eventResult.data.title}". Du erhältst danach einen Teammate-Link und QR-Code.`
      }
    >
      <CaptainSetupForm inviteCode={normalizedInviteCode} joinCode={normalizedJoinCode} />
    </GridShell>
  );
}
