import { StudioPage } from "@/components/cms/studio-page";
import { StudioGamesListSection } from "@/components/cms/studio-page-sections";
import { StudioLinkButton } from "@/components/cms/studio-ui";
import { IconPuzzle } from "@/components/cms/studio-icons";

export default function AdminGamesPage() {
  return (
    <StudioPage
      eyebrow="GRID Studio · Schritt 2"
      title="Spiele"
      description="Hier kochst du eine Mahlzeit: ein vollständiges Spiel bauen, testen, abschmecken. Wenn es sitzt, teilst du es unter Rezepte in Ort, Mission und Team."
      actions={
        <StudioLinkButton href="/admin/packs" variant="ghost" icon={<IconPuzzle size={16} />}>
          Zu den Rezepten
        </StudioLinkButton>
      }
    >
      <StudioGamesListSection />
    </StudioPage>
  );
}
