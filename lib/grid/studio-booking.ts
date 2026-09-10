import { createAdminClient } from "@/lib/supabase/admin";
import { parseRuntimeProfiles } from "@/lib/cms/layer-model";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PublishedStudioGame = {
  id: string;
  slug: string;
  name: string;
  city_slug: string | null;
  gps_enabled: boolean;
  duration_minutes: number | null;
  published_version_number: number;
  runtime_profiles: unknown;
};

export type PublishedStudioGameListItem = {
  id: string;
  slug: string;
  name: string;
  city_slug: string | null;
  published_version: number;
};

export type ResolvedStudioBookingGame = {
  game: PublishedStudioGame;
  versionId: string;
};

type StudioGameRow = PublishedStudioGame & {
  status: string;
  is_template: boolean;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asPublishedGame(row: StudioGameRow): PublishedStudioGame {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city_slug: row.city_slug,
    gps_enabled: row.gps_enabled,
    duration_minutes: row.duration_minutes,
    published_version_number: row.published_version_number,
    runtime_profiles: row.runtime_profiles,
  };
}

function assertBookable(game: StudioGameRow, label: string): void {
  if (game.is_template) {
    throw new Error(`Game "${label}" is a template and cannot be booked`);
  }
  if (game.status !== "published" || game.published_version_number < 1) {
    throw new Error(`Game "${label}" is not published`);
  }
}

async function loadPublishedVersionId(gameId: string, versionNumber: number): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("studio_game_versions")
    .select("id")
    .eq("game_id", gameId)
    .eq("version_number", versionNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(`Published version for game ${gameId} not found`);
  }
  return data.id as string;
}

/** Resolve a published Studio game by slug or UUID for partner bookings. */
export async function resolvePublishedStudioGame(
  organizationId: string,
  slugOrId: string,
): Promise<ResolvedStudioBookingGame> {
  const key = slugOrId.trim();
  if (!key) {
    throw new Error("content_pack_slug is required to start a Studio game");
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("studio_games")
    .select(
      "id, slug, name, city_slug, gps_enabled, duration_minutes, published_version_number, runtime_profiles, status, is_template",
    )
    .eq("organization_id", organizationId);

  query = isUuid(key) ? query.eq("id", key) : query.ilike("slug", key);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(`Game "${key}" not found`);
  }

  const row = data as StudioGameRow;
  assertBookable(row, row.slug || key);
  const versionId = await loadPublishedVersionId(row.id, row.published_version_number);
  return { game: asPublishedGame(row), versionId };
}

export async function listPublishedStudioGames(
  organizationId: string,
): Promise<PublishedStudioGameListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("studio_games")
    .select("id, slug, name, city_slug, published_version_number, status, is_template")
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .eq("is_template", false)
    .gte("published_version_number", 1)
    .order("name");

  if (error) throw new Error(error.message);

  return ((data ?? []) as StudioGameRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    city_slug: row.city_slug,
    published_version: row.published_version_number,
  }));
}

export function studioGameContentConfigFields(game: PublishedStudioGame) {
  const profiles = parseRuntimeProfiles(game.runtime_profiles);
  return {
    cms_game_id: game.id,
    cms_version_number: game.published_version_number,
    content_pack_slug: game.slug,
    mission_duration_minutes: game.duration_minutes ?? 90,
    show_live_score: true,
    content_mode: profiles.default_mode,
    runtime_profiles: game.runtime_profiles ?? undefined,
    allowed_fallbacks: profiles.allowed_fallbacks,
  };
}
