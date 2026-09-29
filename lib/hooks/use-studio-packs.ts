"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLayerPack, listLayerPacks } from "@/app/actions/cms/packs";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import type { StudioLayer } from "@/lib/cms/layer-model";
import { queryKeys } from "@/lib/platform/query-keys";

export function useStudioLayerPacks(layer: StudioLayer, search = "") {
  const { orgSlug } = useStudioShell();
  return useQuery({
    queryKey: queryKeys.packs.list(orgSlug, layer, search),
    queryFn: async () => {
      const result = await listLayerPacks({ layer, search, limit: layer === 1 ? 40 : 200 });
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });
}

export function useStudioLayerPack(packId: string | null) {
  return useQuery({
    queryKey: queryKeys.packs.detail(packId ?? ""),
    queryFn: async () => {
      if (!packId) return null;
      const result = await getLayerPack(packId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: Boolean(packId),
  });
}

export function useInvalidateStudioPacks() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.packs.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
  };
}
