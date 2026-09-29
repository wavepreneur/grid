import { StudioPage } from "@/components/cms/studio-page";
import { StudioGamesListSection } from "@/components/cms/studio-page-sections";
import { StudioLinkButton } from "@/components/cms/studio-ui";
import { IconPuzzle } from "@/components/cms/studio-icons";

export default function AdminGamesPage() {
  return (
    <StudioPage
      title="Spiele"
      description="Spiel zuerst spielbar machen. Packs später andocken — Layer 1 duplizieren, Layer 2/3 nur anhängen."
      actions={
        <StudioLinkButton href="/admin/packs" variant="ghost" icon={<IconPuzzle size={16} />}>
          Layer-Packs
        </StudioLinkButton>
      }
    >
      <StudioGamesListSection />
    </StudioPage>
  );
}
