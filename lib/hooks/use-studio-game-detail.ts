"use client";

import { useQuery } from "@tanstack/react-query";
import { getGameDeleteStatus } from "@/app/actions/cms/delete";
import { getGame, listGameTasks } from "@/app/actions/cms/games";
import { queryKeys } from "@/lib/platform/query-keys";

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
