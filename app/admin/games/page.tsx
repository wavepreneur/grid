import { StudioPage } from "@/components/cms/studio-page";
import { GameList } from "@/components/cms/games/game-list";
import { listBlueprints, listGames } from "@/app/actions/cms/games";

export default async function AdminGamesPage() {
  const [gamesResult, blueprintsResult] = await Promise.all([
    listGames(),
    listBlueprints(),
  ]);

  return (
    <StudioPage
      activePath="/admin/games"
      title="Games"
      description="Spiel-Definitionen (Draft). Publish erzeugt Version — Live-Events bleiben unberührt."
    >
      <GameList
        games={gamesResult.success ? gamesResult.data! : []}
        blueprints={blueprintsResult.success ? blueprintsResult.data! : []}
      />
    </StudioPage>
  );
}
