"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTasksGameUsage } from "@/app/actions/cms/delete";
import { listTasks } from "@/app/actions/cms/tasks";
import { queryKeys } from "@/lib/platform/query-keys";
import type { StudioTask } from "@/lib/cms/types";

export type TaskWithUsage = StudioTask & {
  liveGameCount: number;
  gameLinkCount: number;
};

export function useStudioTasksList(initialTasks: StudioTask[]) {
  return useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: async () => {
      const result = await listTasks();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    initialData: initialTasks,
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
    const result = await listTasks();
    if (result.success && result.data) {
      queryClient.setQueryData(queryKeys.tasks.list(), result.data);
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  };
}
