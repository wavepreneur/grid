import { notFound } from "next/navigation";
import { StudioPage } from "@/components/cms/studio-page";
import { GameEditorPanel } from "@/components/cms/games/game-editor-panel";
import { getGameDeleteStatus } from "@/app/actions/cms/delete";
import { getGame, listGameTasks } from "@/app/actions/cms/games";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminGameDetailPage({ params }: Props) {
  const { id } = await params;

  const [gameResult, linksResult] = await Promise.all([
    getGame(id),
    listGameTasks(id),
  ]);

  if (!gameResult.success || !gameResult.data) notFound();

  const liveMeta = await getGameDeleteStatus(id);
  const liveEventCount = liveMeta.success ? liveMeta.data!.liveEvents.length : 0;
  const game = gameResult.data;

  return (
    <StudioPage
      title={game.name}
      description={
        game.is_template
          ? "Vorlage bearbeiten — Aufgaben, Layer und Logik werden beim Erstellen neuer Spiele dupliziert."
          : "Einstellungen, Layer-Profil und Content-Layer — Änderungen betreffen nur den Entwurf."
      }
    >
      <GameEditorPanel
        game={game}
        taskLinks={linksResult.success ? linksResult.data! : []}
        liveEventCount={liveEventCount}
      />
    </StudioPage>
  );
}
