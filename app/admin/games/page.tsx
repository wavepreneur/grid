import { StudioPage } from "@/components/cms/studio-page";
import { GameList } from "@/components/cms/games/game-list";
import { getGamesDeleteStatus } from "@/app/actions/cms/delete";
import { listGames, listTemplates } from "@/app/actions/cms/games";

export default async function AdminGamesPage() {
  const [gamesResult, templatesResult] = await Promise.all([
    listGames(),
    listTemplates(),
  ]);

  const games = gamesResult.success ? gamesResult.data! : [];
  const metaResult = await getGamesDeleteStatus(games.map((g) => g.id));
  const liveCountByGame = new Map(
    (metaResult.success ? metaResult.data! : []).map((s) => [s.gameId, s.liveEvents.length]),
  );
  const gamesWithLive = games.map((game) => ({
    ...game,
    liveEventCount: liveCountByGame.get(game.id) ?? 0,
  }));

  return (
    <StudioPage
      activePath="/admin/games"
      title="Spiele"
      description="Erstelle und bearbeite Spiele. Änderungen am Entwurf betreffen laufende Events nicht — erst Veröffentlichen und Live-Event starten."
    >
      <GameList
        games={gamesWithLive}
        templates={templatesResult.success ? templatesResult.data! : []}
      />
    </StudioPage>
  );
}
