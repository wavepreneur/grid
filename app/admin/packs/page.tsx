import { StudioPage } from "@/components/cms/studio-page";
import { PackCatalog } from "@/components/cms/packs/pack-catalog";
import { StudioLinkButton } from "@/components/cms/studio-ui";
import { IconGamepad } from "@/components/cms/studio-icons";

export default function AdminPacksPage() {
  return (
    <StudioPage
      eyebrow="GRID Studio · Schritt 3"
      title="Rezepte"
      description="Ein getestetes Spiel aufteilen, die drei Teile benennen, dann Mission und Team mit Städten zu neuen Spielen kombinieren."
      actions={
        <StudioLinkButton href="/admin/games" variant="ghost" icon={<IconGamepad size={16} />}>
          Zu den Spielen
        </StudioLinkButton>
      }
    >
      <PackCatalog />
    </StudioPage>
  );
}
