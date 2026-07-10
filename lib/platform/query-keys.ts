export const queryKeys = {
  org: {
    all: ["grid", "org"] as const,
    slug: () => [...queryKeys.org.all, "slug"] as const,
  },
  studio: {
    all: ["grid", "studio"] as const,
    dashboard: () => [...queryKeys.studio.all, "dashboard"] as const,
  },
  games: {
    all: ["grid", "studio", "games"] as const,
    list: () => [...queryKeys.games.all, "list"] as const,
    templates: () => [...queryKeys.games.all, "templates"] as const,
    liveMeta: (gameIds: string[]) =>
      [...queryKeys.games.all, "live-meta", [...gameIds].sort().join(",")] as const,
    detail: (gameId: string) => [...queryKeys.games.all, "detail", gameId] as const,
    taskLinks: (gameId: string) => [...queryKeys.games.all, "task-links", gameId] as const,
    liveMetaSingle: (gameId: string) => [...queryKeys.games.all, "live-meta", gameId] as const,
  },
  tasks: {
    all: ["grid", "studio", "tasks"] as const,
    list: (filters?: Record<string, string | undefined>) =>
      [...queryKeys.tasks.all, "list", filters ?? {}] as const,
    detail: (taskId: string) => [...queryKeys.tasks.all, "detail", taskId] as const,
    usageMeta: (taskIds: string[]) =>
      [...queryKeys.tasks.all, "usage-meta", [...taskIds].sort().join(",")] as const,
    librarySearch: (query: string) => [...queryKeys.tasks.all, "library", query] as const,
  },
  tickets: {
    all: ["grid", "studio", "tickets"] as const,
    list: () => [...queryKeys.tickets.all, "list"] as const,
  },
  cockpit: {
    all: ["grid", "cockpit"] as const,
    snapshot: (inviteCode: string) => [...queryKeys.cockpit.all, inviteCode] as const,
    show: (inviteCode: string) => [...queryKeys.cockpit.all, "show", inviteCode] as const,
  },
} as const;
