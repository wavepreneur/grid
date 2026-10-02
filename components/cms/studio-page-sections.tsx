"use client";

import { useQuery } from "@tanstack/react-query";
import { listAccessBatches } from "@/app/actions/cms/access";
import { GameList } from "@/components/cms/games/game-list";
import { TaskLibrary } from "@/components/cms/tasks/task-library";
import { TicketAccessPanel } from "@/components/cms/tickets/ticket-access-panel";
import { StudioListSkeleton } from "@/components/cms/studio-list-skeletons";
import { StudioError } from "@/components/cms/studio-ui";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { queryKeys } from "@/lib/platform/query-keys";

export function StudioGamesListSection() {
  return <GameList />;
}

export function StudioTasksListSection() {
  return <TaskLibrary />;
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

  const batches = batchesQuery.data ?? [];
  if (batchesQuery.isPending && batches.length === 0) {
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
        <TicketAccessPanel batches={[]} />
      </div>
    );
  }

  return <TicketAccessPanel batches={batches} />;
}
