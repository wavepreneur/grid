import { StudioPage } from "@/components/cms/studio-page";
import { WorkforceDashboard } from "@/components/data/workforce-dashboard";

export default function DataHomePage() {
  return (
    <StudioPage
      eyebrow="Echtzeit-Analytics"
      title="GRID Data"
      description="Jede Eingabe, jede Lösungszeit und jeder Fehlversuch fließt in die Index-Berechnung. Direkt bei Spielende steht das Benchmark-Dashboard bereit — ohne manuelle Reports."
    >
      <WorkforceDashboard />
    </StudioPage>
  );
}
