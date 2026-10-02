"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStudioCollections } from "@/app/actions/cms/collections";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { queryKeys } from "@/lib/platform/query-keys";

export function useStudioCollections() {
  const { orgSlug } = useStudioShell();
  return useQuery({
    queryKey: queryKeys.collections.list(orgSlug),
    queryFn: async () => {
      const result = await listStudioCollections();
      if (!result.success) throw new Error(result.error);
      return (
        result.data ?? {
          collections: [],
          unassignedGameCount: 0,
          unassignedCityCount: 0,
          unassignedCityCounts: [],
        }
      );
    },
    staleTime: 30_000,
  });
}

export function useInvalidateStudioCollections() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
  };
}
