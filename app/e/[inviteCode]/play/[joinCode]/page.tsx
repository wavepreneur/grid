import { GameGate } from "@/components/game/game-gate";

type EventPlayPageProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
};

export default async function EventPlayPage({ params }: EventPlayPageProps) {
  const { inviteCode, joinCode } = await params;

  return (
    <GameGate
      inviteCode={inviteCode.toUpperCase()}
      joinCode={joinCode.toUpperCase()}
      teamName=""
      eventTitle="Mission"
    />
  );
}
