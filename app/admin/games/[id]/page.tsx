import { notFound } from "next/navigation";
import { StudioPage } from "@/components/cms/studio-page";
import { GameEditorPanel } from "@/components/cms/games/game-editor-panel";
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

  return (
    <StudioPage
      activePath="/admin/games"
      title={gameResult.data.name}
      description="Globale Settings, Tasks aus Bibliothek — Draft getrennt von Live-Events."
    >
      <GameEditorPanel
        game={gameResult.data}
        taskLinks={linksResult.success ? linksResult.data! : []}
        libraryTasks={libraryResult.success ? libraryResult.data! : []}
      />
    </StudioPage>
  );
}
