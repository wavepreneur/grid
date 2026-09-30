"use client";

import { useQuery } from "@tanstack/react-query";
import { getGameDeleteStatus } from "@/app/actions/cms/delete";
import { getGame, listGameTasks } from "@/app/actions/cms/games";
import { getRecipeOriginContext } from "@/app/actions/cms/packs";
import { queryKeys } from "@/lib/platform/query-keys";
import type { StudioGame } from "@/lib/cms/types";

export function useStudioGame(gameId: string) {
  return useQuery({
    queryKey: queryKeys.games.detail(gameId),
    queryFn: async () => {
      const result = await getGame(gameId);
      if (!result.success) throw new Error(result.error);
      if (!result.data) throw new Error("Spiel nicht gefunden.");
      return result.data;
    },
    enabled: Boolean(gameId),
    placeholderData: (previous) => previous,
  });
}

export function useRecipeOrigin(game: StudioGame | undefined) {
  return useQuery({
    queryKey: queryKeys.games.recipeOrigin(game?.id ?? ""),
    queryFn: async () => {
      const result = await getRecipeOriginContext(game!.id);
      if (!result.success) throw new Error(result.error);
      return result.data ?? { origin: null, isSource: false, recipe: null };
    },
    enabled: Boolean(game?.id),
  });
}

export function useStudioGameTaskLinks(gameId: string) {
  return useQuery({
    queryKey: queryKeys.games.taskLinks(gameId),
    queryFn: async () => {
      const result = await listGameTasks(gameId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: Boolean(gameId),
    placeholderData: (previous) => previous,
  });
}

export function useStudioGameLiveMeta(gameId: string) {
  return useQuery({
    queryKey: queryKeys.games.liveMetaSingle(gameId),
    queryFn: async () => {
      const result = await getGameDeleteStatus(gameId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: Boolean(gameId),
    staleTime: 60_000,
  });
}

export async function prefetchStudioGame(queryClient: import("@tanstack/react-query").QueryClient, gameId: string) {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.games.detail(gameId),
      queryFn: async () => {
        const result = await getGame(gameId);
        if (!result.success) throw new Error(result.error);
        return result.data!;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.games.taskLinks(gameId),
      queryFn: async () => {
        const result = await listGameTasks(gameId);
        if (!result.success) throw new Error(result.error);
        return result.data!;
      },
    }),
  ]);
}
