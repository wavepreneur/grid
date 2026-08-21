"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGamesDeleteStatus } from "@/app/actions/cms/delete";
import { listGames, listTemplates } from "@/app/actions/cms/games";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { queryKeys } from "@/lib/platform/query-keys";
import type { StudioGame } from "@/lib/cms/types";

export function useStudioGamesList(initialGames: StudioGame[] = []) {
  const { orgSlug } = useStudioShell();
  const hasSeed = initialGames.length > 0;

  return useQuery({
    queryKey: queryKeys.games.list(orgSlug),
    queryFn: async () => {
      const result = await listGames();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    ...(hasSeed
      ? { initialData: initialGames, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}

export function useStudioTemplates(initialTemplates: StudioGame[] = []) {
  const { orgSlug } = useStudioShell();
  const hasSeed = initialTemplates.length > 0;

  return useQuery({
    queryKey: queryKeys.games.templates(orgSlug),
    queryFn: async () => {
      const result = await listTemplates();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    ...(hasSeed
      ? { initialData: initialTemplates, initialDataUpdatedAt: Date.now() }
      : {}),
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

export function useRefreshStudioGamesList() {
  const queryClient = useQueryClient();
  const { orgSlug } = useStudioShell();
  return async () => {
    const [gamesResult, templatesResult] = await Promise.all([listGames(), listTemplates()]);
    if (gamesResult.success && gamesResult.data) {
      queryClient.setQueryData(queryKeys.games.list(orgSlug), gamesResult.data);
    }
    if (templatesResult.success && templatesResult.data) {
      queryClient.setQueryData(queryKeys.games.templates(orgSlug), templatesResult.data);
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
  };
}
