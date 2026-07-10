"use client";

import { useQuery } from "@tanstack/react-query";
import { listGames } from "@/app/actions/cms/games";
import { listTicketPools } from "@/app/actions/cms/tickets";
import { GameList } from "@/components/cms/games/game-list";
import { TaskLibrary } from "@/components/cms/tasks/task-library";
import { TicketPoolsPanel } from "@/components/cms/tickets/ticket-pools-panel";
import { StudioListSkeleton } from "@/components/cms/studio-list-skeletons";
import { useStudioGamesList, useStudioTemplates } from "@/lib/hooks/use-studio-games";
import { useStudioTasksList } from "@/lib/hooks/use-studio-tasks";
import { queryKeys } from "@/lib/platform/query-keys";

export function StudioGamesListSection() {
  const gamesQuery = useStudioGamesList([]);
  const templatesQuery = useStudioTemplates([]);

  const games = gamesQuery.data ?? [];
  const templates = templatesQuery.data ?? [];
  const isInitialLoad =
    (gamesQuery.isPending && games.length === 0) ||
    (templatesQuery.isPending && templates.length === 0);

  if (isInitialLoad) {
    return <StudioListSkeleton rows={5} />;
  }

  return <GameList initialGames={games} initialTemplates={templates} />;
}

export function StudioTasksListSection() {
  const { data: tasks = [], isPending } = useStudioTasksList([]);

  if (isPending && tasks.length === 0) {
    return <StudioListSkeleton rows={6} />;
  }

  return <TaskLibrary initialTasks={tasks} />;
}

export function StudioTicketsSection() {
  const poolsQuery = useQuery({
    queryKey: queryKeys.tickets.list(),
    queryFn: async () => {
      const result = await listTicketPools();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });
  const gamesQuery = useStudioGamesList([]);

  const pools = poolsQuery.data ?? [];
  const games = gamesQuery.data ?? [];
  const isInitialLoad =
    (poolsQuery.isPending && pools.length === 0) ||
    (gamesQuery.isPending && games.length === 0);

  if (isInitialLoad) {
    return <StudioListSkeleton rows={4} />;
  }

  return <TicketPoolsPanel pools={pools} games={games} />;
}
