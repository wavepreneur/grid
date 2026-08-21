"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listTaskLibraryTags, searchTaskLibrary } from "@/app/actions/cms/tasks";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { queryKeys } from "@/lib/platform/query-keys";

export function useTaskLibrarySearch(
  debouncedQuery: string,
  options?: { quizOnly?: boolean; tag?: string | null },
) {
  const quizOnly = Boolean(options?.quizOnly);
  const tag = options?.tag?.trim() || "";
  return useQuery({
    queryKey: queryKeys.tasks.librarySearch(debouncedQuery, quizOnly, tag),
    queryFn: async () => {
      const result = await searchTaskLibrary({
        query: debouncedQuery,
        tag: tag || null,
        limit: 40,
        quizOnly,
      });
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 15_000,
  });
}

export function useTaskLibraryTags() {
  const { orgSlug } = useStudioShell();
  return useQuery({
    queryKey: queryKeys.tasks.libraryTags(orgSlug),
    queryFn: async () => {
      const result = await listTaskLibraryTags();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 60_000,
  });
}

export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
