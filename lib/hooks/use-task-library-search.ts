"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { searchTaskLibrary } from "@/app/actions/cms/tasks";
import { queryKeys } from "@/lib/platform/query-keys";

export function useTaskLibrarySearch(debouncedQuery: string) {
  return useQuery({
    queryKey: queryKeys.tasks.librarySearch(debouncedQuery),
    queryFn: async () => {
      const result = await searchTaskLibrary({ query: debouncedQuery, limit: 40 });
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 15_000,
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
