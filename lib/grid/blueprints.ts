import type { EventContentConfig, LevelDefinition, ResolvedEventContent } from "@/lib/grid/level-types";

export const BLUEPRINT_SLUGS = ["exitmania", "tabbrain"] as const;
export type BlueprintSlug = (typeof BLUEPRINT_SLUGS)[number];

export type BlueprintArchetype =
  | "ASYMMETRIC_INFORMANT"
  | "TIME_DECAY_SPRINT"
  | "COOPERATIVE_COLLECTIVE";

export type BlueprintCapabilities = {
  gps: boolean;
  navigatorRole: boolean;
};

export type BlueprintDefinition = {
  slug: BlueprintSlug;
  archetype: BlueprintArchetype;
  uiLayout: ResolvedEventContent["uiLayout"];
  capabilities: BlueprintCapabilities;
  /** Default minimum active players before game start (DB still allows max_size 1). */
  minPlayersToStart: number;
  /** When true, a lone Alpha can start and sees Beta UI (puzzle sheet). */
  allowSoloPlay: boolean;
  defaultContent: Pick<
    EventContentConfig,
    "template_slug" | "city_slug" | "show_live_score" | "mission_duration_minutes" | "ui_layout"
  >;
};

export const BLUEPRINTS: Record<BlueprintSlug, BlueprintDefinition> = {
  exitmania: {
    slug: "exitmania",
    archetype: "ASYMMETRIC_INFORMANT",
    uiLayout: "exitmania",
    capabilities: { gps: true, navigatorRole: true },
    minPlayersToStart: 1,
    allowSoloPlay: true,
    defaultContent: {
      city_slug: "berlin",
      show_live_score: true,
      mission_duration_minutes: 90,
      ui_layout: "exitmania",
    },
  },
  tabbrain: {
    slug: "tabbrain",
    archetype: "ASYMMETRIC_INFORMANT",
    uiLayout: "exitmania",
    capabilities: { gps: false, navigatorRole: false },
    minPlayersToStart: 1,
    allowSoloPlay: true,
    defaultContent: {
      template_slug: "tabbrain-enterprise-demo",
      show_live_score: true,
      mission_duration_minutes: 90,
      ui_layout: "exitmania",
    },
  },
};

export function isBlueprintSlug(value: string): value is BlueprintSlug {
  return (BLUEPRINT_SLUGS as readonly string[]).includes(value);
}

export function getBlueprint(slug: BlueprintSlug): BlueprintDefinition {
  return BLUEPRINTS[slug];
}

/** Infer blueprint from stored content_config (backward compatible). */
export function resolveBlueprintSlug(config: EventContentConfig): BlueprintSlug {
  if (config.blueprint_slug && isBlueprintSlug(config.blueprint_slug)) {
    return config.blueprint_slug;
  }
  return "exitmania";
}

export function resolveBlueprint(config: EventContentConfig): BlueprintDefinition {
  return getBlueprint(resolveBlueprintSlug(config));
}

export function mergeContentConfigWithBlueprint(config: EventContentConfig): EventContentConfig {
  const blueprint = resolveBlueprint(config);
  return {
    ...blueprint.defaultContent,
    ...config,
    blueprint_slug: blueprint.slug,
    ui_layout: config.ui_layout ?? blueprint.defaultContent.ui_layout ?? blueprint.uiLayout,
  };
}

/** Strip or downgrade GPS levels when blueprint disables location gameplay. */
export function applyBlueprintLevelConstraints(
  levels: LevelDefinition[],
  blueprint: BlueprintDefinition,
): LevelDefinition[] {
  if (blueprint.capabilities.gps) return levels;

  return levels.map((level) => {
    if (level.type !== "gps") {
      return { ...level, location: undefined };
    }

    if (level.answer) {
      return {
        ...level,
        type: "digital",
        location: undefined,
      };
    }

    if (level.options?.length && level.correct_option_id) {
      return {
        ...level,
        type: "quiz",
        location: undefined,
      };
    }

    return {
      ...level,
      type: "digital",
      answer: level.answer ?? "grid",
      location: undefined,
    };
  });
}

export function buildResolvedBlueprintFields(
  config: EventContentConfig,
): Pick<ResolvedEventContent, "blueprintSlug" | "archetype" | "capabilities" | "uiLayout"> {
  const blueprint = resolveBlueprint(config);
  const merged = mergeContentConfigWithBlueprint(config);

  return {
    blueprintSlug: blueprint.slug,
    archetype: blueprint.archetype,
    capabilities: { ...blueprint.capabilities },
    uiLayout: merged.ui_layout ?? blueprint.uiLayout,
  };
}

export function usesMissionShell(content: Pick<ResolvedEventContent, "uiLayout" | "blueprintSlug">): boolean {
  if (content.blueprintSlug === "exitmania" || content.blueprintSlug === "tabbrain") {
    return true;
  }
  return content.uiLayout === "exitmania";
}

export function buildDefaultContentConfig(blueprintSlug: BlueprintSlug): EventContentConfig {
  const blueprint = getBlueprint(blueprintSlug);
  return {
    blueprint_slug: blueprint.slug,
    ...blueprint.defaultContent,
  };
}
