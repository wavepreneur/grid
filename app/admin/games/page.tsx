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
      title="Spiele"
      description="Erstelle und bearbeite Spiele. Änderungen am Entwurf betreffen laufende Events nicht — erst Veröffentlichen und Live-Event starten."
    >
      <GameList
        games={gamesResult.success ? gamesResult.data! : []}
        blueprints={blueprintsResult.success ? blueprintsResult.data! : []}
      />
    </StudioPage>
  );
}
