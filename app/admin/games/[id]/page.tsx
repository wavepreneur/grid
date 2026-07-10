import { notFound } from "next/navigation";
import { StudioPage } from "@/components/cms/studio-page";
import { GameEditorPanel } from "@/components/cms/games/game-editor-panel";
import { getGameDeleteStatus } from "@/app/actions/cms/delete";
import { getGame, listGameTasks } from "@/app/actions/cms/games";
import { listTasks } from "@/app/actions/cms/tasks";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminGameDetailPage({ params }: Props) {
  const { id } = await params;
  const orgId = await getStudioOrganizationId();

  const [gameResult, linksResult, libraryResult] = await Promise.all([
    getGame(id),
    listGameTasks(id),
    listTasks({ organizationId: orgId }),
  ]);

  if (!gameResult.success || !gameResult.data) notFound();

  const liveMeta = await getGameDeleteStatus(id);
  const liveEventCount = liveMeta.success ? liveMeta.data!.liveEvents.length : 0;

  const game = gameResult.data;

  return (
    <StudioPage
      activePath="/admin/games"
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
        libraryTasks={libraryResult.success ? libraryResult.data! : []}
        liveEventCount={liveEventCount}
      />
    </StudioPage>
  );
}
