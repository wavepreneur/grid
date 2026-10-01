"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLayerPack, listComposeRecipes, listLayerPacks } from "@/app/actions/cms/packs";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { COMPOSE_L1_LIST_MAX } from "@/lib/cms/layer-packs";
import type { StudioLayer } from "@/lib/cms/layer-model";
import { queryKeys } from "@/lib/platform/query-keys";

export function useStudioLayerPacks(layer: StudioLayer) {
  const { orgSlug } = useStudioShell();
  return useQuery({
    queryKey: queryKeys.packs.list(orgSlug, layer),
    queryFn: async () => {
      const result = await listLayerPacks({ layer, limit: layer === 1 ? COMPOSE_L1_LIST_MAX : 200 });
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    placeholderData: (previous) => previous,
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

export function useComposeRecipes(includeArchived = false) {
  const { orgSlug } = useStudioShell();
  return useQuery({
    queryKey: queryKeys.packs.recipes(orgSlug, includeArchived),
    queryFn: async () => {
      const result = await listComposeRecipes({ includeArchived });
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
  });
}

export function useInvalidateStudioPacks() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.packs.all });
  };
}
