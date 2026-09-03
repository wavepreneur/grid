"use client";

import { useQuery } from "@tanstack/react-query";
import { listAccessBatches } from "@/app/actions/cms/access";
import { GameList } from "@/components/cms/games/game-list";
import { TaskLibrary } from "@/components/cms/tasks/task-library";
import { TicketAccessPanel } from "@/components/cms/tickets/ticket-access-panel";
import { StudioListSkeleton } from "@/components/cms/studio-list-skeletons";
import { StudioError } from "@/components/cms/studio-ui";
import { useStudioGamesList, useStudioTemplates } from "@/lib/hooks/use-studio-games";
import { useStudioTasksList } from "@/lib/hooks/use-studio-tasks";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
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
  const { orgSlug } = useStudioShell();
  const batchesQuery = useQuery({
    queryKey: queryKeys.tickets.list(orgSlug),
    queryFn: async () => {
      const result = await listAccessBatches();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });
  const gamesQuery = useStudioGamesList([]);

  const batches = batchesQuery.data ?? [];
  const games = gamesQuery.data ?? [];
  const isInitialLoad =
    (batchesQuery.isPending && batches.length === 0) ||
    (gamesQuery.isPending && games.length === 0);

  if (isInitialLoad) {
    return <StudioListSkeleton rows={4} />;
  }

  if (batchesQuery.isError) {
    return (
      <div className="space-y-4">
        <StudioError
          message={
            batchesQuery.error instanceof Error
              ? batchesQuery.error.message
              : "Tickets konnten nicht geladen werden."
          }
        />
        <TicketAccessPanel batches={[]} games={games} />
      </div>
    );
  }

  return <TicketAccessPanel batches={batches} games={games} />;
}
