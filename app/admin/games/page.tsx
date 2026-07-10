import { StudioPage } from "@/components/cms/studio-page";
import { StudioGamesListSection } from "@/components/cms/studio-page-sections";

export default function AdminGamesPage() {
  return (
    <StudioPage
      title="Spiele"
      description="Erstelle und bearbeite Spiele. Änderungen am Entwurf betreffen laufende Events nicht — erst Veröffentlichen und Live-Event starten."
    >
      <StudioGamesListSection />
    </StudioPage>
  );
}
