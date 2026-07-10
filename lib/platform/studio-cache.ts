"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/platform/query-keys";
import type { StudioGame, StudioGameTaskLink, StudioTask, StudioTicketPool } from "@/lib/cms/types";

export function useStudioCache() {
  const queryClient = useQueryClient();

  return {
    setGame(game: StudioGame) {
      queryClient.setQueryData(queryKeys.games.detail(game.id), game);
      queryClient.setQueryData<StudioGame[]>(queryKeys.games.list(), (old) =>
        old?.map((entry) => (entry.id === game.id ? game : entry)),
      );
      queryClient.setQueryData<StudioGame[]>(queryKeys.games.templates(), (old) =>
        old?.map((entry) => (entry.id === game.id ? game : entry)),
      );
    },

    patchGame(gameId: string, patch: Partial<StudioGame>) {
      queryClient.setQueryData<StudioGame>(queryKeys.games.detail(gameId), (old) =>
        old ? { ...old, ...patch } : old,
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
    },

    setTask(task: StudioTask) {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      queryClient.setQueryData<StudioTask[]>(queryKeys.tasks.list(), (old) => {
        if (!old) return old;
        const index = old.findIndex((entry) => entry.id === task.id);
        if (index === -1) return [task, ...old];
        const next = [...old];
        next[index] = task;
        return next;
      });
    },

    invalidateTasks() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },

    prependTicketPool(pool: StudioTicketPool) {
      queryClient.setQueryData<StudioTicketPool[]>(queryKeys.tickets.list(), (old) =>
        old ? [pool, ...old] : [pool],
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.studio.dashboard() });
    },

    patchTicketPool(poolId: string, patch: Partial<StudioTicketPool>) {
      queryClient.setQueryData<StudioTicketPool[]>(queryKeys.tickets.list(), (old) =>
        old?.map((pool) => (pool.id === poolId ? { ...pool, ...patch } : pool)),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.studio.dashboard() });
    },

    invalidateTickets() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.studio.dashboard() });
    },
  };
}
