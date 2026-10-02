"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLayerPack, listComposeRecipes, listLayerPacksPage } from "@/app/actions/cms/packs";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import type { PackListSort } from "@/lib/cms/layer-packs";
import type { StudioLayer } from "@/lib/cms/layer-model";
import { queryKeys } from "@/lib/platform/query-keys";

export type PackListFilters = {
  layer: StudioLayer;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: PackListSort;
};

export function packListQueryKey(orgSlug: string, filters: PackListFilters) {
  return queryKeys.packs.list(
    orgSlug,
    filters.layer,
    [
      filters.search ?? "",
      String(filters.page ?? 1),
      String(filters.pageSize ?? 20),
      filters.sort ?? "updated",
    ].join("|"),
  );
}

export function useStudioLayerPacks(filters: PackListFilters) {
  const { orgSlug } = useStudioShell();
  return useQuery({
    queryKey: packListQueryKey(orgSlug, filters),
    queryFn: async () => {
      const result = await listLayerPacksPage(filters);
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
