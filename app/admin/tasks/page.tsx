import { StudioPage } from "@/components/cms/studio-page";
import { StudioTasksListSection } from "@/components/cms/studio-page-sections";
import { StudioLinkButton } from "@/components/cms/studio-ui";
import { IconPlus } from "@/components/cms/studio-icons";

export default function AdminTasksPage() {
  return (
    <StudioPage
      title="Aufgaben"
      description="Deine Rätsel-Bibliothek — unabhängig von Spielen. Suche, Tags und Live-Status."
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
