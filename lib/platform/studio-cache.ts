"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { queryKeys } from "@/lib/platform/query-keys";
import type { GameListPage, StudioGame, StudioGameTaskLink, StudioTask, StudioTicketPool } from "@/lib/cms/types";

export function useStudioCache() {
  const queryClient = useQueryClient();
  const { orgSlug } = useStudioShell();

  return {
    setGame(game: StudioGame) {
      queryClient.setQueryData(queryKeys.games.detail(game.id), game);
      queryClient.setQueriesData<GameListPage>(
        { queryKey: [...queryKeys.games.all, "list"] },
        (old) =>
          old?.games
            ? {
                ...old,
                games: old.games.map((entry) => (entry.id === game.id ? { ...entry, ...game } : entry)),
              }
            : old,
      );
      queryClient.setQueryData<StudioGame[]>(queryKeys.games.templates(orgSlug), (old) =>
        old?.map((entry) => (entry.id === game.id ? game : entry)),
      );
    },

    patchGame(gameId: string, patch: Partial<StudioGame>) {
      queryClient.setQueryData<StudioGame>(queryKeys.games.detail(gameId), (old) =>
        old ? { ...old, ...patch } : old,
      );
      queryClient.setQueriesData<GameListPage>(
        { queryKey: [...queryKeys.games.all, "list"] },
        (old) =>
          old?.games
            ? {
                ...old,
                games: old.games.map((entry) => (entry.id === gameId ? { ...entry, ...patch } : entry)),
              }
            : old,
      );
      queryClient.setQueryData<StudioGame[]>(queryKeys.games.templates(orgSlug), (old) =>
        old?.map((entry) => (entry.id === gameId ? { ...entry, ...patch } : entry)),
      );
    },

    setGameTaskLinks(gameId: string, links: StudioGameTaskLink[]) {
      queryClient.setQueryData(queryKeys.games.taskLinks(gameId), links);
    },

    patchGameTaskLink(gameId: string, link: StudioGameTaskLink) {
      queryClient.setQueryData<StudioGameTaskLink[]>(
        queryKeys.games.taskLinks(gameId),
        (old) => old?.map((entry) => (entry.id === link.id ? link : entry)),
      );
    },

    invalidateGame(gameId: string) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.games.taskLinks(gameId) });
    },

    removeGame(gameId: string) {
      queryClient.removeQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.removeQueries({ queryKey: queryKeys.games.taskLinks(gameId) });
      queryClient.setQueriesData<GameListPage>(
        { queryKey: [...queryKeys.games.all, "list"] },
        (old) =>
          old?.games
            ? {
                games: old.games.filter((entry) => entry.id !== gameId),
                total: Math.max(0, old.total - 1),
              }
            : old,
      );
      queryClient.setQueryData<StudioGame[]>(queryKeys.games.templates(orgSlug), (old) =>
        old?.filter((entry) => entry.id !== gameId),
      );
    },

    setTask(task: StudioTask) {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },

    invalidateTasks() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },

    prependTicketPool(pool: StudioTicketPool) {
      queryClient.setQueryData<StudioTicketPool[]>(queryKeys.tickets.list(orgSlug), (old) =>
        old ? [pool, ...old] : [pool],
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.studio.dashboard(orgSlug) });
    },

    patchTicketPool(poolId: string, patch: Partial<StudioTicketPool>) {
      queryClient.setQueryData<StudioTicketPool[]>(queryKeys.tickets.list(orgSlug), (old) =>
        old?.map((pool) => (pool.id === poolId ? { ...pool, ...patch } : pool)),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.studio.dashboard(orgSlug) });
    },

    invalidateTickets() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.studio.dashboard(orgSlug) });
    },
  };
}
