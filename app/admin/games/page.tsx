import { StudioPage } from "@/components/cms/studio-page";
import { GameList } from "@/components/cms/games/game-list";
import { listGames, listTemplates } from "@/app/actions/cms/games";

export default async function AdminGamesPage() {
  const [gamesResult, templatesResult] = await Promise.all([
    listGames(),
    listTemplates(),
  ]);

  return (
    <StudioPage
      activePath="/admin/games"
      title="Spiele"
      description="Erstelle und bearbeite Spiele. Änderungen am Entwurf betreffen laufende Events nicht — erst Veröffentlichen und Live-Event starten."
    >
      <GameList
        initialGames={gamesResult.success ? gamesResult.data! : []}
        initialTemplates={templatesResult.success ? templatesResult.data! : []}
      />
    </StudioPage>
  );
}
