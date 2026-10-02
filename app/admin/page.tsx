import { StudioPage } from "@/components/cms/studio-page";
import { StudioOverviewSection } from "@/components/cms/studio-overview-section";
import { getPortalProfilePublic } from "@/app/actions/portal-profile";

export default async function AdminOverviewPage() {
  const profile = await getPortalProfilePublic();

  return (
    <StudioPage
      eyebrow="Backoffice"
      title={`Willkommen zurück, ${profile.firstName}`}
      description="Zutaten sammeln, ein Spiel kochen, dann unter Rezepte teilen und mit Städten kombinieren."
    >
      <StudioOverviewSection />
    </StudioPage>
  );
}
