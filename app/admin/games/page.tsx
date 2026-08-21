import { StudioPage } from "@/components/cms/studio-page";
import { StudioGamesListSection } from "@/components/cms/studio-page-sections";
import { StudioLinkButton } from "@/components/cms/studio-ui";
import { IconPuzzle } from "@/components/cms/studio-icons";

export default function AdminGamesPage() {
  return (
    <StudioPage
      title="Spiele"
      description="Neue Stadt? Spiel duplizieren, Layer 1 austauschen, fertig. Layer 2 und 3 bleiben verknüpft."
      actions={
        <StudioLinkButton href="/admin/tasks" variant="ghost" icon={<IconPuzzle size={16} />}>
          Aufgaben
        </StudioLinkButton>
      }
    >
      <StudioGamesListSection />
    </StudioPage>
  );
}
