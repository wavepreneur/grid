import { StudioPage } from "@/components/cms/studio-page";
import { TemplateGallery } from "@/components/cms/templates/template-gallery";
import { listBlueprints, listTemplates } from "@/app/actions/cms/games";

export default async function AdminTemplatesPage() {
  const [blueprintsResult, templatesResult] = await Promise.all([
    listBlueprints(),
    listTemplates(),
  ]);

  return (
    <StudioPage
      activePath="/admin/templates"
      title="Templates"
      description="System-Blueprints (Quiz, Rogain, Match…) und deine gespeicherten Games als Vorlage."
    >
      <TemplateGallery
        blueprints={blueprintsResult.success ? blueprintsResult.data! : []}
        savedTemplates={templatesResult.success ? templatesResult.data! : []}
      />
    </StudioPage>
  );
}
