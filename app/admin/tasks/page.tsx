import { StudioPage } from "@/components/cms/studio-page";
import { StudioTasksListSection } from "@/components/cms/studio-page-sections";
import { StudioLinkButton } from "@/components/cms/studio-ui";
import { IconPlus } from "@/components/cms/studio-icons";

export default function AdminTasksPage() {
  return (
    <StudioPage
      eyebrow="GRID Studio · Schritt 1"
      title="Aufgaben"
      description="Hier entsteht der Vorrat. Packs (Stadt / Mission / Team) bündeln die Aufgaben — das Spiel steckt sie nur zusammen."
      actions={
        <StudioLinkButton href="/admin/tasks/new" icon={<IconPlus size={16} />}>
          Neue Aufgabe
        </StudioLinkButton>
      }
    >
      <StudioTasksListSection />
    </StudioPage>
  );
}
