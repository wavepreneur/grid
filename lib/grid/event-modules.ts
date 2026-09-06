export type EventModuleKey = "custom_routes" | "custom_quiz" | "team_intelligence";

export type EventModules = Record<EventModuleKey, boolean>;

/** Existing events without a modules key keep today's portal editors, no Data. */
export const DEFAULT_EVENT_MODULES: EventModules = {
  custom_routes: true,
  custom_quiz: true,
  team_intelligence: false,
};

export function parseEventModules(value: unknown): EventModules {
  if (!value || typeof value !== "object") return { ...DEFAULT_EVENT_MODULES };
  const raw = value as Record<string, unknown>;
  return {
    custom_routes:
      typeof raw.custom_routes === "boolean" ? raw.custom_routes : DEFAULT_EVENT_MODULES.custom_routes,
    custom_quiz:
      typeof raw.custom_quiz === "boolean" ? raw.custom_quiz : DEFAULT_EVENT_MODULES.custom_quiz,
    team_intelligence:
      typeof raw.team_intelligence === "boolean"
        ? raw.team_intelligence
        : DEFAULT_EVENT_MODULES.team_intelligence,
  };
}

export function mergeBookingModules(input?: Partial<EventModules> | null): EventModules {
  if (!input) return { ...DEFAULT_EVENT_MODULES };
  return parseEventModules({ ...DEFAULT_EVENT_MODULES, ...input });
}

export function modulesFromContentConfig(contentConfig: unknown): EventModules {
  if (!contentConfig || typeof contentConfig !== "object") return { ...DEFAULT_EVENT_MODULES };
  return parseEventModules((contentConfig as { modules?: unknown }).modules);
}
