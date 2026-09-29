"use client";

import { PackEditor } from "@/components/cms/packs/pack-editor";
import { StudioError } from "@/components/cms/studio-ui";
import { StudioGameDetailSkeleton } from "@/components/cms/studio-list-skeletons";
import { layerPackTitleDe } from "@/lib/cms/layer-packs";
import { useStudioLayerPack } from "@/lib/hooks/use-studio-packs";

export function PackEditorSection({ packId }: { packId: string }) {
  const query = useStudioLayerPack(packId);

  if (query.isPending && !query.data) {
    return <StudioGameDetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <StudioError
        message={query.error instanceof Error ? query.error.message : "Pack nicht gefunden."}
      />
    );
  }

  const { pack, items } = query.data;
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-muted-foreground">{layerPackTitleDe(pack.layer)}</p>
      <PackEditor pack={pack} items={items} />
    </div>
  );
}
