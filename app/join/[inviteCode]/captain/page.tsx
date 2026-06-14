import { notFound } from "next/navigation";
import { getEventInvite } from "@/app/actions/lobby";
import { GridShell } from "@/components/grid/grid-shell";
import { CaptainSetupForm } from "@/components/lobby/captain-setup-form";

type CaptainPageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function CaptainPage({ params }: CaptainPageProps) {
  const { inviteCode } = await params;
  const normalizedInviteCode = inviteCode.toUpperCase();
  const eventResult = await getEventInvite(normalizedInviteCode);

  if (!eventResult.success) {
    notFound();
  }

  return (
    <GridShell
      title="Captain Setup"
      description={`Erstelle dein Team für „${eventResult.data.title}“. Du erhältst danach einen Teammate-Link und QR-Code.`}
    >
      <CaptainSetupForm inviteCode={normalizedInviteCode} />
    </GridShell>
  );
}
