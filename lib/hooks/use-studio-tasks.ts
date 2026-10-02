"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTasksGameUsage } from "@/app/actions/cms/delete";
import { listTasks } from "@/app/actions/cms/tasks";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { queryKeys } from "@/lib/platform/query-keys";
import type { StudioTask, TaskFilterInput, TaskListPage } from "@/lib/cms/types";

export type TaskWithUsage = StudioTask & {
  liveGameCount: number;
  publishedGameCount: number;
  gameLinkCount: number;
};

export function taskListQueryKey(orgSlug: string, filters: TaskFilterInput = {}) {
  return queryKeys.tasks.list(orgSlug, {
    page: String(filters.page ?? 1),
    pageSize: String(filters.pageSize ?? 20),
    search: filters.search ?? "",
    tag: filters.tag ?? "",
    sort: filters.sort ?? "updated",
  });
}

export function useStudioTasksList(filters: TaskFilterInput = {}) {
  const { orgSlug } = useStudioShell();

  return useQuery({
    queryKey: taskListQueryKey(orgSlug, filters),
    queryFn: async () => {
      const result = await listTasks(filters);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    placeholderData: (previous) => previous,
  });
}

export function useTasksUsageMeta(taskIds: string[]) {
  return useQuery({
    queryKey: queryKeys.tasks.usageMeta(taskIds),
    queryFn: async () => {
      if (taskIds.length === 0) return [];
      const result = await getTasksGameUsage(taskIds);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: taskIds.length > 0,
    staleTime: 60_000,
  });
}

export function useInvalidateStudioTasks() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  };
}

export function useRefreshStudioTasksList() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  };
}

export type { TaskListPage };
