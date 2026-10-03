import { StudioPage } from "@/components/cms/studio-page";
import { StudioTasksListSection } from "@/components/cms/studio-page-sections";
import { StudioLinkButton } from "@/components/cms/studio-ui";
import { IconPlus } from "@/components/cms/studio-icons";

export default function AdminTasksPage() {
  return (
    <StudioPage
      eyebrow="GRID Studio · Schritt 1"
      title="Zutaten"
      description="Hier sammelst du den Vorrat. Je mehr Rätsel, desto schneller entstehen später neue Spiele. Inhalt bleibt hier — Spiele und Rezepte greifen nur darauf zu."
      actions={
        <StudioLinkButton href="/app/tasks/new" icon={<IconPlus size={16} />}>
          Neue Zutat
        </StudioLinkButton>
      }
    >
      <StudioTasksListSection />
    </StudioPage>
  );
}
