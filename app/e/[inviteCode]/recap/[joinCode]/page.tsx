import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityPlayShell } from "@/components/game/city/play-shell";
import { GameOverFlywheel } from "@/components/game/game-over-flywheel";
import { loadPublicTeamRecap } from "@/lib/grid/public-recap";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
};

export default async function TeamRecapPage({ params }: Props) {
  const { inviteCode, joinCode } = await params;
  const recap = await loadPublicTeamRecap(inviteCode, joinCode);
  if (!recap) notFound();

  return (
    <CityPlayShell mode={recap.eventContent.contentMode}>
      <GameOverFlywheel
        inviteCode={recap.inviteCode}
        joinCode={recap.joinCode}
        teamName={recap.teamName}
        score={recap.score}
        levels={recap.eventContent.levels}
        gameState={recap.gameState}
        growthOffer={recap.eventContent.growthOffer}
      />
    </CityPlayShell>
  );
}
