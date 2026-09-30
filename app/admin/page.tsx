import { StudioPage } from "@/components/cms/studio-page";
import { StudioOverviewSection } from "@/components/cms/studio-overview-section";

export default function AdminOverviewPage() {
  return (
    <StudioPage
      eyebrow="Backoffice"
      title="Willkommen zurück"
      description="Zutaten sammeln, ein Spiel kochen, dann unter Rezepte teilen und mit Städten kombinieren."
    >
      <StudioOverviewSection />
    </StudioPage>
  );
}
