"use client";

import { useQuery } from "@tanstack/react-query";
import { getTask } from "@/app/actions/cms/tasks";
import { queryKeys } from "@/lib/platform/query-keys";

export function useStudioTask(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: async () => {
      const result = await getTask(taskId);
      if (!result.success) throw new Error(result.error);
      if (!result.data) throw new Error("Aufgabe nicht gefunden.");
      return result.data;
    },
    enabled: Boolean(taskId),
  });
}

export async function prefetchStudioTask(queryClient: import("@tanstack/react-query").QueryClient, taskId: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: async () => {
      const result = await getTask(taskId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });
}
