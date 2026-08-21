import { StudioPage } from "@/components/cms/studio-page";
import { StudioOverviewSection } from "@/components/cms/studio-overview-section";

export default function AdminOverviewPage() {
  return (
    <StudioPage
      eyebrow="Backoffice"
      title="Willkommen zurück"
      description="Aufgaben liegen einmal in der Bibliothek und werden mit beliebig vielen Spielen verknüpft. So entstehen aus wenigen Bausteinen schnell neue Stadtvarianten."
    >
      <StudioOverviewSection />
    </StudioPage>
  );
}
