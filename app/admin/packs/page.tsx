import { StudioPage } from "@/components/cms/studio-page";
import { PackCatalog } from "@/components/cms/packs/pack-catalog";
import { StudioLinkButton } from "@/components/cms/studio-ui";
import { IconGamepad } from "@/components/cms/studio-icons";

export default function AdminPacksPage() {
  return (
    <StudioPage
      eyebrow="GRID Studio · Schritt 2"
      title="Layer-Packs"
      description="Bündel, kein zweites CMS. Aufgaben bleiben in Aufgaben, Bedingungen im Spiel. Layer 1 duplizieren, Layer 2/3 andocken."
      actions={
        <StudioLinkButton href="/admin/games" variant="ghost" icon={<IconGamepad size={16} />}>
          Spiele
        </StudioLinkButton>
      }
    >
      <PackCatalog />
    </StudioPage>
  );
}
