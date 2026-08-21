import type {
  EventContentConfig,
  EventRouteOverride,
  LevelDefinition,
  ResolvedEventContent,
  RouteTemplate,
} from "@/lib/grid/level-types";
import {
  applyBlueprintLevelConstraints,
  buildResolvedBlueprintFields,
  mergeContentConfigWithBlueprint,
  resolveBlueprint,
} from "@/lib/grid/blueprints";
import { DEFAULT_TEMPLATE_SLUG, EXITMANIA_TOTAL_LEVELS } from "@/lib/grid/level-types";
import { resolveContentMode } from "@/lib/grid/play-slots";
import { parseRuntimeProfiles } from "@/lib/cms/layer-model";

export function parseLevelDefinitions(value: unknown): LevelDefinition[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is LevelDefinition => {
      if (!item || typeof item !== "object") return false;
      const level = item as Partial<LevelDefinition>;
      return (
        typeof level.level === "number" &&
        typeof level.type === "string" &&
        typeof level.title === "string" &&
        typeof level.description === "string"
      );
    })
    .sort((a, b) => a.level - b.level);
}

export function parseContentConfig(value: unknown): EventContentConfig {
  if (!value || typeof value !== "object") return {};
  return value as EventContentConfig;
}

export function parseRouteOverride(value: unknown): EventRouteOverride {
  if (!value || typeof value !== "object") return {};
  return value as EventRouteOverride;
}

export function mergeLevelOverrides(
  baseLevels: LevelDefinition[],
  override: EventRouteOverride,
): LevelDefinition[] {
  const overrideLevels = override.levels ?? {};
  const stationOverrides = override.stations ?? {};

  return baseLevels.map((level) => {
    const patch = overrideLevels[String(level.level)];
    const stationPatch = stationOverrides[String(level.level)];
    if (!patch && !stationPatch) return level;

    const nextType = patch?.type ?? level.type;
    const mergedStation =
      stationPatch || patch?.station
        ? {
            ...(level.station ?? { name: level.title, place: "", code: "" }),
            ...level.station,
            ...patch?.station,
            ...stationPatch,
          }
        : level.station;

    return {
      ...level,
      ...patch,
      level: level.level,
      type: nextType,
      options: patch?.options ?? level.options,
      tiles: patch?.tiles ?? level.tiles,
      hero_image_url: patch?.hero_image_url ?? level.hero_image_url,
      location:
        nextType === "gps"
          ? (patch?.location ?? level.location)
          : patch?.location,
      answer: patch?.answer ?? level.answer,
      arrival_quiz: patch?.arrival_quiz ?? level.arrival_quiz,
      station: mergedStation,
    };
  });
}

export function resolveEventContent(input: {
  template: Pick<RouteTemplate, "slug" | "name" | "city" | "levels">;
  contentConfig: unknown;
  routeOverride: unknown;
}): ResolvedEventContent {
  const contentConfig = mergeContentConfigWithBlueprint(parseContentConfig(input.contentConfig));
  const blueprint = resolveBlueprint(contentConfig);
  const routeOverride = parseRouteOverride(input.routeOverride);
  const baseLevels = parseLevelDefinitions(input.template.levels);
  const mergedLevels = applyBlueprintLevelConstraints(
    mergeLevelOverrides(baseLevels, routeOverride),
    blueprint,
  );

  const profiles = parseRuntimeProfiles(contentConfig.runtime_profiles);
  const contentMode = resolveContentMode({
    contentMode: contentConfig.content_mode ?? profiles.default_mode,
    blueprintSlug: contentConfig.blueprint_slug,
  });
  const allowedFallbacks =
    contentConfig.allowed_fallbacks?.filter((m) => m !== contentMode) ??
    profiles.allowed_fallbacks.filter((m) => m !== contentMode);

  return {
    templateSlug: contentConfig.template_slug ?? input.template.slug ?? DEFAULT_TEMPLATE_SLUG,
    templateName: input.template.name,
    city: input.template.city,
    levels: mergedLevels.slice(0, EXITMANIA_TOTAL_LEVELS),
    ...buildResolvedBlueprintFields(contentConfig),
    showLiveScore: contentConfig.show_live_score ?? true,
    missionDurationMinutes: contentConfig.mission_duration_minutes ?? 90,
    contentMode,
    allowedFallbacks,
    routeOrder: profiles.route_order,
  };
}

export function getLevelDefinition(
  content: ResolvedEventContent,
  levelNumber: number,
): LevelDefinition | null {
  return content.levels.find((level) => level.level === levelNumber) ?? null;
}

export function requiresGps(level: LevelDefinition): boolean {
  return level.type === "gps" && Boolean(level.location);
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
