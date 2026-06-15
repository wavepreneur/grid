import { createAdminClient } from "@/lib/supabase/admin";
import {
  mergeLevelOverrides,
  parseContentConfig,
  parseLevelDefinitions,
  parseRouteOverride,
} from "@/lib/grid/content-engine";
import { getCityIdBySlug } from "@/lib/grid/organizations";
import type {
  EventContentConfig,
  EventRouteOverride,
  LevelDefinition,
  ResolvedEventContent,
} from "@/lib/grid/level-types";
import {
  DEFAULT_CITY_SLUG,
  DEFAULT_TEMPLATE_SLUG,
  EXITMANIA_TOTAL_LEVELS,
} from "@/lib/grid/level-types";
import { parseLevelTiles } from "@/lib/grid/level-content";

type GlobalLevelRow = {
  level_number: number;
  content: Record<string, unknown>;
};

type WaypointRow = {
  global_level_id: string;
  lat: number;
  lng: number;
  radius_meters: number;
  intro_text: string | null;
};

type GlobalLevelWithId = GlobalLevelRow & { id: string };

function assembleLevelDefinition(
  globalLevel: GlobalLevelRow,
  waypoint: WaypointRow | null,
): LevelDefinition | null {
  const content = globalLevel.content;
  const type = content.type;
  if (typeof type !== "string") return null;

  const title = content.title;
  const description = content.description;
  if (typeof title !== "string" || typeof description !== "string") return null;

  const level: LevelDefinition = {
    level: globalLevel.level_number,
    type: type as LevelDefinition["type"],
    title,
    description: waypoint?.intro_text?.trim() || description,
  };

  if (typeof content.answer === "string") level.answer = content.answer;
  if (Array.isArray(content.options)) level.options = content.options as LevelDefinition["options"];
  if (typeof content.correct_option_id === "string") {
    level.correct_option_id = content.correct_option_id;
  }
  if (typeof content.role_required === "string") {
    level.role_required = content.role_required as LevelDefinition["role_required"];
  }
  if (typeof content.hero_image_url === "string" && content.hero_image_url.trim()) {
    level.hero_image_url = content.hero_image_url.trim();
  }
  const tiles = parseLevelTiles(content.tiles);
  if (tiles) level.tiles = tiles;
  if (content.media && typeof content.media === "object") {
    level.media = content.media as LevelDefinition["media"];
  }
  if (content.hints && Array.isArray(content.hints)) {
    level.hints = content.hints as LevelDefinition["hints"];
  }
  if (content.triggers && typeof content.triggers === "object") {
    level.triggers = content.triggers as LevelDefinition["triggers"];
  }

  if (waypoint) {
    level.location = {
      lat: waypoint.lat,
      lng: waypoint.lng,
      radius_meters: waypoint.radius_meters,
    };
  } else if (content.location && typeof content.location === "object") {
    level.location = content.location as LevelDefinition["location"];
  }

  return level;
}

async function loadLevelsFromGlobalSchema(cityId: string): Promise<LevelDefinition[]> {
  const supabase = createAdminClient();

  const { data: globalLevels, error: levelsError } = await supabase
    .from("global_levels")
    .select("id, level_number, content")
    .eq("is_active", true)
    .order("level_number", { ascending: true });

  if (levelsError) throw new Error(levelsError.message);

  const { data: waypoints, error: waypointsError } = await supabase
    .from("local_waypoints")
    .select("global_level_id, lat, lng, radius_meters, intro_text")
    .eq("city_id", cityId);

  if (waypointsError) throw new Error(waypointsError.message);

  const waypointByLevelId = new Map<string, WaypointRow>();
  for (const waypoint of waypoints ?? []) {
    waypointByLevelId.set(waypoint.global_level_id, waypoint as WaypointRow);
  }

  const levels: LevelDefinition[] = [];
  for (const row of (globalLevels ?? []) as GlobalLevelWithId[]) {
    const assembled = assembleLevelDefinition(row, waypointByLevelId.get(row.id) ?? null);
    if (assembled) levels.push(assembled);
  }

  return levels.sort((a, b) => a.level - b.level);
}

async function loadLevelsFromLegacyTemplate(templateSlug: string): Promise<{
  templateName: string;
  city: string | null;
  levels: LevelDefinition[];
}> {
  const supabase = createAdminClient();
  const { data: template, error } = await supabase
    .from("route_templates")
    .select("slug, name, city, levels")
    .eq("slug", templateSlug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!template) {
    throw new Error(`Route-Template „${templateSlug}" nicht gefunden.`);
  }

  return {
    templateName: template.name,
    city: template.city,
    levels: parseLevelDefinitions(template.levels),
  };
}

export async function loadResolvedEventContent(input: {
  eventId: string;
  organizationId: string;
  cityId: string | null;
  contentConfig: unknown;
  routeOverride: unknown;
}): Promise<ResolvedEventContent> {
  const contentConfig = parseContentConfig(input.contentConfig);
  const routeOverride = parseRouteOverride(input.routeOverride);
  const citySlug = contentConfig.city_slug ?? DEFAULT_CITY_SLUG;

  let baseLevels: LevelDefinition[];
  let templateName: string;
  let cityName: string | null = null;
  let templateSlug = contentConfig.template_slug ?? DEFAULT_TEMPLATE_SLUG;

  const resolvedCityId =
    input.cityId ??
    (await getCityIdBySlug(input.organizationId, citySlug));

  if (resolvedCityId) {
    baseLevels = await loadLevelsFromGlobalSchema(resolvedCityId);
    templateName = `Exitmania ${citySlug}`;
    cityName = citySlug;
    templateSlug = `global:${citySlug}`;
  } else {
    const legacy = await loadLevelsFromLegacyTemplate(
      contentConfig.template_slug ?? DEFAULT_TEMPLATE_SLUG,
    );
    baseLevels = legacy.levels;
    templateName = legacy.templateName;
    cityName = legacy.city;
  }

  const mergedLevels = mergeLevelOverrides(baseLevels, routeOverride);

  const uiLayout = contentConfig.ui_layout ?? "exitmania";
  const showLiveScore = contentConfig.show_live_score ?? true;
  const missionDurationMinutes = contentConfig.mission_duration_minutes ?? 90;

  return {
    templateSlug,
    templateName,
    city: cityName,
    levels: mergedLevels.slice(0, EXITMANIA_TOTAL_LEVELS),
    uiLayout,
    showLiveScore,
    missionDurationMinutes,
  };
}

export async function loadResolvedEventContentByEventId(
  eventId: string,
): Promise<ResolvedEventContent> {
  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, organization_id, city_id, content_config, route_override")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    throw new Error("Event nicht gefunden.");
  }

  return loadResolvedEventContent({
    eventId: event.id,
    organizationId: event.organization_id,
    cityId: event.city_id,
    contentConfig: event.content_config,
    routeOverride: event.route_override,
  });
}
