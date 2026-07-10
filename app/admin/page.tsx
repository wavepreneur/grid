import { StudioPage } from "@/components/cms/studio-page";
import { StudioOverviewSection } from "@/components/cms/studio-overview-section";

export default function AdminOverviewPage() {
  return (
    <StudioPage
      title="Übersicht"
      description="Willkommen in GRID Studio. Hier erstellst und verwaltest du Spiele, Aufgaben und Tickets — getrennt von laufenden Live-Events."
    >
      <StudioOverviewSection />
    </StudioPage>
  );
}
