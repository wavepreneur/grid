export const queryKeys = {
  org: {
    all: ["grid", "org"] as const,
    slug: () => [...queryKeys.org.all, "slug"] as const,
  },
  studio: {
    all: ["grid", "studio"] as const,
    dashboard: (orgSlug?: string) =>
      [...queryKeys.studio.all, "dashboard", orgSlug ?? ""] as const,
  },
  games: {
    all: ["grid", "studio", "games"] as const,
    list: (orgSlug?: string) => [...queryKeys.games.all, "list", orgSlug ?? ""] as const,
    templates: (orgSlug?: string) =>
      [...queryKeys.games.all, "templates", orgSlug ?? ""] as const,
    liveMeta: (gameIds: string[]) =>
      [...queryKeys.games.all, "live-meta", "list", [...gameIds].sort().join(",")] as const,
    detail: (gameId: string) => [...queryKeys.games.all, "detail", gameId] as const,
    taskLinks: (gameId: string) => [...queryKeys.games.all, "task-links", gameId] as const,
    liveMetaSingle: (gameId: string) =>
      [...queryKeys.games.all, "live-meta", "single", gameId] as const,
  },
  tasks: {
    all: ["grid", "studio", "tasks"] as const,
    list: (orgSlug?: string, filters?: Record<string, string | undefined>) =>
      [...queryKeys.tasks.all, "list", orgSlug ?? "", filters ?? {}] as const,
    detail: (taskId: string) => [...queryKeys.tasks.all, "detail", taskId] as const,
    usageMeta: (taskIds: string[]) =>
      [...queryKeys.tasks.all, "usage-meta", [...taskIds].sort().join(",")] as const,
    librarySearch: (query: string, quizOnly = false, tag = "") =>
      [...queryKeys.tasks.all, "library", query, quizOnly, tag] as const,
    libraryTags: (orgSlug: string) => [...queryKeys.tasks.all, "library-tags", orgSlug] as const,
  },
  tickets: {
    all: ["grid", "studio", "tickets"] as const,
    list: (orgSlug?: string) => [...queryKeys.tickets.all, "list", orgSlug ?? ""] as const,
  },
  cockpit: {
    all: ["grid", "cockpit"] as const,
    snapshot: (inviteCode: string) => [...queryKeys.cockpit.all, inviteCode] as const,
    show: (inviteCode: string) => [...queryKeys.cockpit.all, "show", inviteCode] as const,
  },
} as const;
