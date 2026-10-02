"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGamesDeleteStatus } from "@/app/actions/cms/delete";
import { listGames, listTemplates, searchStudioGames } from "@/app/actions/cms/games";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { queryKeys } from "@/lib/platform/query-keys";
import type { GameFilterInput, GameListPage, StudioGame } from "@/lib/cms/types";

export function gameListQueryKey(orgSlug: string, filters: GameFilterInput = {}) {
  return queryKeys.games.list(orgSlug, {
    page: String(filters.page ?? 1),
    pageSize: String(filters.pageSize ?? 20),
    search: filters.search ?? "",
    status: filters.status ?? "alle",
    language: filters.language ?? "alle",
    source: filters.sourceIds?.join(",") ?? "",
    collection: filters.collectionId ?? "",
    sort: filters.sort ?? "updated",
  });
}

export function useStudioGamesList(filters: GameFilterInput = {}) {
  const { orgSlug } = useStudioShell();

  return useQuery({
    queryKey: gameListQueryKey(orgSlug, filters),
    queryFn: async () => {
      const result = await listGames(filters);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    placeholderData: (previous) => previous,
  });
}

export function useStudioGamePicker(input: {
  search?: string;
  publishedOnly?: boolean;
  excludeCompose?: boolean;
  enabled?: boolean;
}) {
  const { orgSlug } = useStudioShell();
  return useQuery({
    queryKey: queryKeys.games.picker(orgSlug, {
      search: input.search ?? "",
      published: input.publishedOnly ? "1" : "",
      excludeCompose: input.excludeCompose ? "1" : "",
    }),
    queryFn: async () => {
      const result = await searchStudioGames({
        search: input.search,
        publishedOnly: input.publishedOnly,
        excludeCompose: input.excludeCompose,
        limit: 20,
      });
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: input.enabled !== false,
    staleTime: 15_000,
    placeholderData: (previous) => previous,
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
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
  };
}

export type { GameListPage };
