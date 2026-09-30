import { StudioPage } from "@/components/cms/studio-page";
import { PackEditorSection } from "@/components/cms/packs/pack-editor-section";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminPackDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <StudioPage title="Bestandteil" description="Ein benannter Teil aus einem getesteten Spiel. Inhalt bleibt in den Zutaten.">
      <PackEditorSection packId={id} />
    </StudioPage>
  );
}
