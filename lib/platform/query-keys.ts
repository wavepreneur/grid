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
  collections: {
    all: ["grid", "studio", "collections"] as const,
    list: (orgSlug?: string) =>
      [...queryKeys.collections.all, "list", orgSlug ?? ""] as const,
  },
  games: {
    all: ["grid", "studio", "games"] as const,
    list: (orgSlug?: string, filters?: Record<string, string | undefined>) =>
      [...queryKeys.games.all, "list", orgSlug ?? "", filters ?? {}] as const,
    picker: (orgSlug?: string, filters?: Record<string, string | undefined>) =>
      [...queryKeys.games.all, "picker", orgSlug ?? "", filters ?? {}] as const,
    templates: (orgSlug?: string) =>
      [...queryKeys.games.all, "templates", orgSlug ?? ""] as const,
    liveMeta: (gameIds: string[]) =>
      [...queryKeys.games.all, "live-meta", "list", [...gameIds].sort().join(",")] as const,
    detail: (gameId: string) => [...queryKeys.games.all, "detail", gameId] as const,
    recipeOrigin: (gameId: string) => [...queryKeys.games.all, "recipe-origin", gameId] as const,
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
    librarySearch: (query: string, quizOnly = false, tags = "") =>
      [...queryKeys.tasks.all, "library", query, quizOnly, tags] as const,
    libraryTags: (orgSlug: string) => [...queryKeys.tasks.all, "library-tags", orgSlug] as const,
  },
  packs: {
    all: ["grid", "studio", "packs"] as const,
    list: (orgSlug: string, layer: number, search = "") =>
      [...queryKeys.packs.all, "list", orgSlug, layer, search] as const,
    recipes: (orgSlug: string, includeArchived = false) =>
      [...queryKeys.packs.all, "recipes", orgSlug, includeArchived] as const,
    detail: (packId: string) => [...queryKeys.packs.all, "detail", packId] as const,
  },
  tickets: {
    all: ["grid", "studio", "tickets"] as const,
    list: (orgSlug?: string) => [...queryKeys.tickets.all, "list", orgSlug ?? ""] as const,
  },
  cockpit: {
    all: ["grid", "cockpit"] as const,
    overview: () => [...queryKeys.cockpit.all, "overview"] as const,
    snapshot: (inviteCode: string) => [...queryKeys.cockpit.all, inviteCode] as const,
    show: (inviteCode: string) => [...queryKeys.cockpit.all, "show", inviteCode] as const,
  },
  data: {
    all: ["grid", "data"] as const,
    dashboard: () => [...queryKeys.data.all, "dashboard"] as const,
  },
} as const;
