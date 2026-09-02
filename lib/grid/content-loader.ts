import { createAdminClient } from "@/lib/supabase/admin";
import {
  mergeLevelOverrides,
  parseContentConfig,
  parseLevelDefinitions,
  parseRouteOverride,
} from "@/lib/grid/content-engine";
import {
  applyBlueprintLevelConstraints,
  buildResolvedBlueprintFields,
  mergeContentConfigWithBlueprint,
  resolveBlueprint,
} from "@/lib/grid/blueprints";
import { getCityIdBySlug } from "@/lib/grid/organizations";
import type {
  ArrivalQuiz,
  LevelDefinition,
  LevelStation,
  ResolvedEventContent,
  StationKind,
} from "@/lib/grid/level-types";
import {
  DEFAULT_CITY_SLUG,
  DEFAULT_TEMPLATE_SLUG,
  EXITMANIA_TOTAL_LEVELS,
} from "@/lib/grid/level-types";
import { parseLevelTiles } from "@/lib/grid/level-content";
import { loadStudioVersionSnapshot } from "@/lib/cms/studio-snapshot";
import { loadLiveStudioGameSnapshot } from "@/lib/cms/studio-live-content";
import {
  parseContentMode,
  parseRuntimeProfiles,
  type ContentMode,
} from "@/lib/cms/layer-model";
import { resolveContentMode } from "@/lib/grid/play-slots";
import { buildDefaultStation, normalizeStationCode } from "@/lib/grid/stations";
import { parseBonusTask } from "@/lib/grid/bonus";
import { parseGameHelpLinks } from "@/lib/grid/game-help-links";
import { parseFollowUpTrigger } from "@/lib/grid/follow-up-trigger";

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

type StationRow = {
  global_level_id: string;
  name: string;
  place: string;
  code: string;
  kind: string;
  minutes: number | null;
  points: number | null;
};

type GlobalLevelWithId = GlobalLevelRow & { id: string };

function parseArrivalQuiz(raw: unknown): ArrivalQuiz | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const q = raw as Partial<ArrivalQuiz> & { correct_option_ids?: string[] };
  if (typeof q.question !== "string" || !Array.isArray(q.options)) return undefined;
  const multi = Array.isArray(q.correct_option_ids) ? q.correct_option_ids.filter(Boolean) : [];
  const single =
    typeof q.correct_option_id === "string"
      ? q.correct_option_id
      : multi[0];
  if (!single) return undefined;
  return {
    question: q.question,
    options: q.options as ArrivalQuiz["options"],
    correct_option_id: single,
    ...(multi.length > 0 ? { correct_option_ids: multi } : {}),
    ...(typeof q.title === "string" && q.title.trim() ? { title: q.title.trim() } : {}),
    ...(typeof q.image_url === "string" && q.image_url.trim()
      ? { image_url: q.image_url.trim() }
      : {}),
    ...(typeof q.description === "string" && q.description.trim()
      ? { description: q.description.trim() }
      : {}),
    ...(typeof q.side_fact === "string" && q.side_fact.trim()
      ? { side_fact: q.side_fact.trim() }
      : {}),
    ...(typeof q.points === "number" && q.points > 0 ? { points: Math.round(q.points) } : {}),
  };
}

function parseStationFromContent(raw: unknown): LevelStation | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Partial<LevelStation>;
  if (typeof s.code !== "string" || typeof s.name !== "string") return undefined;
  return {
    name: s.name,
    place: typeof s.place === "string" ? s.place : "",
    code: s.code,
    kind: s.kind as StationKind | undefined,
    minutes: typeof s.minutes === "number" ? s.minutes : undefined,
    points: typeof s.points === "number" ? s.points : undefined,
  };
}

function assembleLevelDefinition(
  globalLevel: GlobalLevelRow,
  waypoint: WaypointRow | null,
  station: StationRow | null,
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
  if (typeof content.question === "string") level.question = content.question;
  if (Array.isArray(content.options)) level.options = content.options as LevelDefinition["options"];
  if (typeof content.correct_option_id === "string") {
    level.correct_option_id = content.correct_option_id;
  }
  if (
    content.input_mode === "text" ||
    content.input_mode === "number" ||
    content.input_mode === "boxes" ||
    content.input_mode === "confirm"
  ) {
    level.input_mode = content.input_mode;
  }
  if (
    content.number_fields === 1 ||
    content.number_fields === 2 ||
    content.number_fields === 3 ||
    content.number_fields === 4
  ) {
    level.number_fields = content.number_fields;
  }
  if (typeof content.role_required === "string") {
    level.role_required = content.role_required as LevelDefinition["role_required"];
  }
  if (typeof content.hero_image_url === "string" && content.hero_image_url.trim()) {
    level.hero_image_url = content.hero_image_url.trim();
  }
  if (typeof content.teaser === "string") level.teaser = content.teaser;
  if (typeof content.role_split === "string") level.role_split = content.role_split;

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

  const arrivalQuiz = parseArrivalQuiz(content.arrival_quiz);
  if (arrivalQuiz) level.arrival_quiz = arrivalQuiz;

  const bonus = parseBonusTask(content.bonus);
  if (bonus) level.bonus = bonus;

  const contentStation = parseStationFromContent(content.station);
  if (station) {
    level.station = {
      name: station.name,
      place: station.place,
      code: station.code,
      kind: station.kind as StationKind,
      minutes: station.minutes ?? undefined,
      points: station.points ?? undefined,
    };
  } else if (contentStation) {
    level.station = contentStation;
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

  // Stations table may not exist until migration is applied — fail soft.
  const { data: stations, error: stationsError } = await supabase
    .from("local_stations")
    .select("global_level_id, name, place, code, kind, minutes, points")
    .eq("city_id", cityId);

  if (stationsError && !/does not exist|schema cache/i.test(stationsError.message)) {
    throw new Error(stationsError.message);
  }

  const waypointByLevelId = new Map<string, WaypointRow>();
  for (const waypoint of waypoints ?? []) {
    waypointByLevelId.set(waypoint.global_level_id, waypoint as WaypointRow);
  }

  const stationByLevelId = new Map<string, StationRow>();
  for (const row of stations ?? []) {
    stationByLevelId.set(row.global_level_id, row as StationRow);
  }

  const levels: LevelDefinition[] = [];
  for (const row of (globalLevels ?? []) as GlobalLevelWithId[]) {
    const assembled = assembleLevelDefinition(
      row,
      waypointByLevelId.get(row.id) ?? null,
      stationByLevelId.get(row.id) ?? null,
    );
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

function ensureIndoorStations(levels: LevelDefinition[]): LevelDefinition[] {
  return levels.map((level) => {
    if (level.station?.code) {
      return { ...level, type: level.type === "gps" ? "station" : level.type };
    }
    const generated = buildDefaultStation({
      index1Based: level.level,
      name: level.title,
      place: level.description.slice(0, 80),
      seed: `${level.title}:${level.level}`,
    });
    return {
      ...level,
      type: level.type === "gps" ? "station" : level.type,
      station: generated,
      location: undefined,
    };
  });
}

function applyContentModeToLevels(
  levels: LevelDefinition[],
  mode: ContentMode,
): LevelDefinition[] {
  if (mode === "indoor") {
    return ensureIndoorStations(levels);
  }

  if (mode === "online") {
    return levels.map((level) => ({
      ...level,
      type: level.type === "gps" || level.type === "station" ? "digital" : level.type,
      location: undefined,
      station: undefined,
    }));
  }

  // outdoor: keep waypoints; drop station-only chrome unless also useful
  return levels.map((level) => ({
    ...level,
    station: undefined,
  }));
}

function resolveModeAndFallbacks(contentConfig: ReturnType<typeof parseContentConfig>): {
  contentMode: ContentMode;
  allowedFallbacks: ContentMode[];
  routeOrder: "linear" | "free";
} {
  const profiles = parseRuntimeProfiles(contentConfig.runtime_profiles);
  const contentMode = resolveContentMode({
    contentMode: contentConfig.content_mode ?? profiles.default_mode,
    blueprintSlug: contentConfig.blueprint_slug,
  });
  const allowedFallbacks =
    contentConfig.allowed_fallbacks?.filter(
      (m): m is ContentMode => m === "outdoor" || m === "indoor" || m === "online",
    ) ?? profiles.allowed_fallbacks;

  return {
    contentMode: parseContentMode(contentMode),
    allowedFallbacks: allowedFallbacks.filter((m) => m !== contentMode),
    routeOrder: profiles.route_order,
  };
}

function withSurfaceFields(
  base: Omit<ResolvedEventContent, "contentMode" | "allowedFallbacks" | "routeOrder" | "roleLabels">,
  contentConfig: ReturnType<typeof parseContentConfig>,
  levels: LevelDefinition[],
): ResolvedEventContent {
  const { contentMode, allowedFallbacks, routeOrder } = resolveModeAndFallbacks(contentConfig);
  const profiles = parseRuntimeProfiles(contentConfig.runtime_profiles);
  return {
    ...base,
    contentMode,
    allowedFallbacks,
    routeOrder,
    roleLabels: profiles.role_labels,
    levels: applyContentModeToLevels(levels, contentMode),
  };
}

export async function loadResolvedEventContent(input: {
  eventId: string;
  organizationId: string;
  cityId: string | null;
  contentConfig: unknown;
  routeOverride: unknown;
  studioGameVersionId?: string | null;
}): Promise<ResolvedEventContent> {
  const contentConfig = mergeContentConfigWithBlueprint(parseContentConfig(input.contentConfig));
  const routeOverride = parseRouteOverride(input.routeOverride);

  // Studio test sessions always compile from the live editor state so „Testen“
  // reflects saved changes without requiring a new publish.
  if (contentConfig.is_studio_test && contentConfig.cms_game_id) {
    const live = await loadLiveStudioGameSnapshot(contentConfig.cms_game_id);
    if (live && live.levels.length > 0) {
      const { game, levels, compiledLogic } = live;
      const mergedConfig = mergeContentConfigWithBlueprint({
        ...contentConfig,
        blueprint_slug: game.gps_enabled ? "exitmania" : "tabbrain",
        city_slug: game.city_slug ?? contentConfig.city_slug,
        runtime_profiles: game.runtime_profiles ?? contentConfig.runtime_profiles,
        content_mode: parseRuntimeProfiles(game.runtime_profiles).default_mode,
      });
      const blueprint = resolveBlueprint(mergedConfig);
      const mergedLevels = applyBlueprintLevelConstraints(
        mergeLevelOverrides(levels, routeOverride),
        blueprint,
      );
      const blueprintFields = buildResolvedBlueprintFields(mergedConfig);

      return withSurfaceFields(
        {
          templateSlug: `cms:${game.slug}:live`,
          templateName: game.name,
          city: game.city_slug,
          levels: mergedLevels,
          compiledLogic,
          ...blueprintFields,
          showLiveScore: contentConfig.show_live_score ?? true,
          missionDurationMinutes:
            game.duration_minutes ?? contentConfig.mission_duration_minutes ?? 90,
          briefingText: game.description?.trim() || null,
          ...parseGameHelpLinks(game.feature_flags),
          followUpTrigger: parseFollowUpTrigger(game.feature_flags),
          logoUrl: typeof game.logo_url === "string" && game.logo_url.trim() ? game.logo_url.trim() : null,
        },
        mergedConfig,
        mergedLevels,
      );
    }
  }

  if (input.studioGameVersionId) {
    const snapshot = await loadStudioVersionSnapshot(input.studioGameVersionId);
    if (snapshot && snapshot.levels.length > 0) {
      const { game, levels, compiledLogic } = snapshot;
      const mergedConfig = mergeContentConfigWithBlueprint({
        ...contentConfig,
        blueprint_slug: game.gps_enabled ? "exitmania" : "tabbrain",
        city_slug: game.city_slug ?? contentConfig.city_slug,
        runtime_profiles: game.runtime_profiles ?? contentConfig.runtime_profiles,
        content_mode: parseRuntimeProfiles(game.runtime_profiles).default_mode,
      });
      const blueprint = resolveBlueprint(mergedConfig);
      const mergedLevels = applyBlueprintLevelConstraints(
        mergeLevelOverrides(levels, routeOverride),
        blueprint,
      );
      const blueprintFields = buildResolvedBlueprintFields(mergedConfig);

      return withSurfaceFields(
        {
          templateSlug: `cms:${game.slug}:v${game.published_version_number}`,
          templateName: game.name,
          city: game.city_slug,
          levels: mergedLevels,
          compiledLogic,
          ...blueprintFields,
          showLiveScore: contentConfig.show_live_score ?? true,
          missionDurationMinutes:
            game.duration_minutes ?? contentConfig.mission_duration_minutes ?? 90,
          briefingText: game.description?.trim() || null,
          ...parseGameHelpLinks(game.feature_flags),
          followUpTrigger: parseFollowUpTrigger(game.feature_flags),
          logoUrl: typeof game.logo_url === "string" && game.logo_url.trim() ? game.logo_url.trim() : null,
        },
        mergedConfig,
        mergedLevels,
      );
    }
  }

  const blueprint = resolveBlueprint(contentConfig);
  const citySlug = contentConfig.city_slug ?? blueprint.defaultContent.city_slug ?? DEFAULT_CITY_SLUG;
  const { contentMode } = resolveModeAndFallbacks(contentConfig);

  let baseLevels: LevelDefinition[];
  let templateName: string;
  let cityName: string | null = null;
  let templateSlug = contentConfig.template_slug ?? DEFAULT_TEMPLATE_SLUG;

  // Load city pack for outdoor/indoor (waypoints + stations). Online may still use city for branding.
  const needsCityPack =
    contentMode === "outdoor" ||
    contentMode === "indoor" ||
    (blueprint.capabilities.gps &&
      Boolean(contentConfig.city_slug ?? blueprint.defaultContent.city_slug));

  const resolvedCityId = needsCityPack
    ? (input.cityId ?? (await getCityIdBySlug(input.organizationId, citySlug)))
    : null;

  if (resolvedCityId) {
    baseLevels = await loadLevelsFromGlobalSchema(resolvedCityId);
    templateName = `Exitmania ${citySlug}`;
    cityName = citySlug;
    templateSlug = `global:${citySlug}`;
  } else {
    const legacyTemplateSlug =
      contentConfig.template_slug ?? blueprint.defaultContent.template_slug ?? DEFAULT_TEMPLATE_SLUG;
    const legacy = await loadLevelsFromLegacyTemplate(legacyTemplateSlug);
    baseLevels = legacy.levels;
    templateName = legacy.templateName;
    cityName = legacy.city;
    templateSlug = legacyTemplateSlug;
  }

  const mergedLevels = applyBlueprintLevelConstraints(
    mergeLevelOverrides(baseLevels, routeOverride),
    blueprint,
  );

  const blueprintFields = buildResolvedBlueprintFields(contentConfig);

  return withSurfaceFields(
    {
      templateSlug,
      templateName,
      city: cityName,
      levels: mergedLevels.slice(0, EXITMANIA_TOTAL_LEVELS),
      ...blueprintFields,
      showLiveScore: contentConfig.show_live_score ?? true,
      missionDurationMinutes: contentConfig.mission_duration_minutes ?? 90,
    },
    contentConfig,
    mergedLevels.slice(0, EXITMANIA_TOTAL_LEVELS),
  );
}

export async function loadResolvedEventContentByEventId(
  eventId: string,
): Promise<ResolvedEventContent> {
  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, organization_id, city_id, content_config, route_override, studio_game_version_id",
    )
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
    studioGameVersionId: event.studio_game_version_id,
  });
}

/** Find a level by indoor station code (normalized). */
export function findLevelByStationCode(
  levels: LevelDefinition[],
  code: string,
): LevelDefinition | null {
  const normalized = normalizeStationCode(code);
  return (
    levels.find((l) => l.station && normalizeStationCode(l.station.code) === normalized) ?? null
  );
}
