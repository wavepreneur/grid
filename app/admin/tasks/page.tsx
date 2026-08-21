import { StudioPage } from "@/components/cms/studio-page";
import { StudioTasksListSection } from "@/components/cms/studio-page-sections";
import { StudioLinkButton } from "@/components/cms/studio-ui";
import { IconPlus } from "@/components/cms/studio-icons";

export default function AdminTasksPage() {
  return (
    <StudioPage
      eyebrow="GRID Studio · Schritt 1"
      title="Aufgaben"
      description="Hier entsteht der Vorrat. Jede Aufgabe existiert genau einmal und ist neutral — ob sie später Umgebung, Level oder Bonus wird, entscheidest du erst im Spiel."
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
