"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGamesDeleteStatus } from "@/app/actions/cms/delete";
import { listGames, listTemplates } from "@/app/actions/cms/games";
import { queryKeys } from "@/lib/platform/query-keys";
import type { StudioGame } from "@/lib/cms/types";

export function useStudioGamesList(initialGames: StudioGame[]) {
  return useQuery({
    queryKey: queryKeys.games.list(),
    queryFn: async () => {
      const result = await listGames();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    initialData: initialGames,
  });
}

export function useStudioTemplates(initialTemplates: StudioGame[]) {
  return useQuery({
    queryKey: queryKeys.games.templates(),
    queryFn: async () => {
      const result = await listTemplates();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    initialData: initialTemplates,
  });
}

export function useGamesLiveMeta(gameIds: string[]) {
  return useQuery({
    queryKey: queryKeys.games.liveMeta(gameIds),
    queryFn: async () => {
      if (gameIds.length === 0) return [];
      const result = await getGamesDeleteStatus(gameIds);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: gameIds.length > 0,
    staleTime: 60_000,
  });
}

export function useInvalidateStudioGames() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
  };
}
