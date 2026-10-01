"use server";

import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import { parseBonusWhen, type BonusAudience } from "@/lib/cms/bonus-bindings";
import { parseStudioLanguage, type StudioLanguage } from "@/lib/cms/languages";
import {
  DEFAULT_RUNTIME_PROFILES,
  isStudioLayer,
  parseRuntimeProfiles,
  type StudioLayer,
} from "@/lib/cms/layer-model";
import {
  COMPOSE_GAMES_MAX,
  COMPOSE_L1_LIST_MAX,
  CREATE_CITIES_MAX,
  DUPLICATE_PACKS_MAX,
  PACK_SEARCH_LIMIT,
  PACK_SLOT_MAX,
  composeGameName,
  gameUsesLayerPacks,
  mapStudioTaskRow,
  mergePackLinksOntoGame,
  normalizeComposeRecipeRow,
  normalizeLayerPackRow,
  packItemToGameLink,
  parsePackLinkId,
  sharedLayer1ItemOverrides,
  splitOverridesForLayerPacks,
  stripGeoFromMissionOverrides,
  withFreshStationCode,
  type StudioComposeRecipe,
  type StudioLayerPack,
  type StudioLayerPackItem,
} from "@/lib/cms/layer-packs";
import { slugifyStudio, type StudioGame, type StudioGameTaskLink, type StudioTask } from "@/lib/cms/types";
import { normalizeTaskContent } from "@/lib/cms/task-content";
import { isUuid } from "@/lib/cms/city-directory";
import { parseLinkLayer, parseLinkOverrides } from "@/lib/cms/game-link-config";
import { surfaceToPreset, taskToOpenerArrivalQuiz } from "@/lib/cms/game-slots";
import { seedCityShellTranslations } from "@/lib/cms/city-shell-i18n";
import { parseGpsOverride, type GpsPin } from "@/lib/cms/gps-defaults";
import { generateGameSlug } from "@/lib/grid/codes";
import { parseCustomerStationCode, randomStationAccessCode } from "@/lib/grid/stations";
import type { ActionResult } from "@/lib/grid/types";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

function sanitizeIlike(raw: string): string {
  return raw.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

function revalidatePacks() {
  // Catalog pages are React Query. Next path revalidation only delays the write.
}

async function ensureUniquePackSlug(
  supabase: AdminClient,
  organizationId: string,
  layer: StudioLayer,
  name: string,
): Promise<string> {
  const base = slugifyStudio(name) || (layer === 1 ? "stadt" : layer === 2 ? "mission" : "team");
  let candidate = base.slice(0, 64);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const { data } = await supabase
      .from("studio_layer_packs")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("layer", layer)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${attempt + 2}`.slice(0, 64);
  }
  throw new Error("Pack-Slug konnte nicht erzeugt werden.");
}

function mapPackItemRow(row: Record<string, unknown>): StudioLayerPackItem | null {
  const taskRaw = Array.isArray(row.studio_tasks) ? row.studio_tasks[0] : row.studio_tasks;
  if (!taskRaw || typeof taskRaw !== "object") return null;
  return {
    id: String(row.id),
    pack_id: String(row.pack_id),
    task_id: String(row.task_id),
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
    overrides: (row.overrides as Record<string, unknown>) ?? {},
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    task: mapStudioTaskRow(taskRaw as Record<string, unknown>),
  };
}

const PACK_ITEM_SELECT =
  "id, pack_id, task_id, sort_order, overrides, created_at, updated_at, studio_tasks(*)";

export async function fetchPackItems(
  supabase: AdminClient,
  packId: string,
): Promise<StudioLayerPackItem[]> {
  const { data, error } = await supabase
    .from("studio_layer_pack_items")
    .select(PACK_ITEM_SELECT)
    .eq("pack_id", packId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) => {
    const item = mapPackItemRow(row as Record<string, unknown>);
    return item ? [item] : [];
  });
}

export async function fetchPackItem(
  supabase: AdminClient,
  itemId: string,
): Promise<StudioLayerPackItem | null> {
  const { data, error } = await supabase
    .from("studio_layer_pack_items")
    .select(PACK_ITEM_SELECT)
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPackItemRow(data as Record<string, unknown>) : null;
}

async function fetchPackItemAtSort(
  supabase: AdminClient,
  packId: string,
  sortOrder: number,
): Promise<StudioLayerPackItem | null> {
  const { data, error } = await supabase
    .from("studio_layer_pack_items")
    .select(PACK_ITEM_SELECT)
    .eq("pack_id", packId)
    .eq("sort_order", sortOrder)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPackItemRow(data as Record<string, unknown>) : null;
}

async function fetchPackItemsByIds(
  supabase: AdminClient,
  packIds: string[],
): Promise<Map<string, StudioLayerPackItem[]>> {
  const unique = [...new Set(packIds.filter(Boolean))];
  const map = new Map<string, StudioLayerPackItem[]>();
  for (let index = 0; index < unique.length; index += 25) {
    const chunk = unique.slice(index, index + 25);
    const rows = await Promise.all(
      chunk.map(async (id) => [id, await fetchPackItems(supabase, id)] as const),
    );
    for (const [id, items] of rows) map.set(id, items);
  }
  return map;
}

async function getOwnedPack(
  supabase: AdminClient,
  orgId: string,
  packId: string,
): Promise<StudioLayerPack | null> {
  const { data, error } = await supabase
    .from("studio_layer_packs")
    .select("*")
    .eq("id", packId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
    return data ? normalizeLayerPackRow(data as Record<string, unknown>) : null;
}

async function getOwnedCity(
  supabase: AdminClient,
  orgId: string,
  cityId: string | null | undefined,
): Promise<{ id: string; slug: string; name: string } | null> {
  if (!cityId || !isUuid(cityId)) return null;
  const { data, error } = await supabase
    .from("cities")
    .select("id, slug, name, source_city_id")
    .eq("id", cityId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (!data.source_city_id) return null;
  return { id: String(data.id), slug: String(data.slug), name: String(data.name) };
}

async function refreshPackSlotCount(supabase: AdminClient, packId: string): Promise<number> {
  const { count, error } = await supabase
    .from("studio_layer_pack_items")
    .select("id", { count: "exact", head: true })
    .eq("pack_id", packId);
  if (error) throw new Error(error.message);
  const slotCount = count ?? 0;
  const { error: updateError } = await supabase
    .from("studio_layer_packs")
    .update({ slot_count: slotCount, updated_at: new Date().toISOString() })
    .eq("id", packId);
  if (updateError) throw new Error(updateError.message);
  return slotCount;
}

function mapLegacyLinkRow(row: Record<string, unknown>, gameId: string): StudioGameTaskLink | null {
  const taskRaw = Array.isArray(row.studio_tasks) ? row.studio_tasks[0] : row.studio_tasks;
  if (!taskRaw || typeof taskRaw !== "object") return null;
  const partial = {
    id: String(row.id),
    game_id: gameId,
    task_id: String(row.task_id),
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
    overrides: (row.overrides as Record<string, unknown>) ?? {},
    layer: (row.layer === 1 || row.layer === 2 || row.layer === 3 ? row.layer : 2) as StudioLayer,
    task: mapStudioTaskRow(taskRaw as Record<string, unknown>),
  };
  return { ...partial, layer: parseLinkLayer(partial) };
}

export async function loadMergedGameTaskLinksForGame(
  supabase: AdminClient,
  game: StudioGame,
): Promise<StudioGameTaskLink[]> {
  const { data, error } = await supabase
    .from("studio_game_tasks")
    .select("id, game_id, task_id, layer, sort_order, overrides, studio_tasks(*)")
    .eq("game_id", game.id)
    .order("sort_order");
  if (error) throw new Error(error.message);

  const legacyLinks = (data ?? []).flatMap((row) => {
    const link = mapLegacyLinkRow(row as Record<string, unknown>, game.id);
    return link ? [link] : [];
  });

  if (!gameUsesLayerPacks(game)) return legacyLinks;

  const packIds = [game.layer1_pack_id, game.layer2_pack_id, game.layer3_pack_id].filter(
    (id): id is string => Boolean(id),
  );
  const packs: Partial<Record<StudioLayer, StudioLayerPackItem[]>> = {};
  await Promise.all(
    packIds.map(async (packId) => {
      const items = await fetchPackItems(supabase, packId);
      const layer = items[0]?.task.layer;
      const packLayer: StudioLayer | null =
        packId === game.layer1_pack_id ? 1 : packId === game.layer2_pack_id ? 2 : packId === game.layer3_pack_id ? 3 : null;
      if (packLayer) packs[packLayer] = items;
      void layer;
    }),
  );

  return mergePackLinksOntoGame({ game, legacyLinks, packs });
}

export async function listLayerPacks(input: {
  layer: StudioLayer;
  search?: string;
  limit?: number;
}): Promise<ActionResult<StudioLayerPack[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const limit = Math.min(COMPOSE_L1_LIST_MAX, Math.max(1, input.limit ?? PACK_SEARCH_LIMIT));
    const search = sanitizeIlike(input.search ?? "");

    let query = supabase
      .from("studio_layer_packs")
      .select("*")
      .eq("organization_id", orgId)
      .eq("layer", input.layer)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`name.ilike.%${search}%,city_slug.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return {
      success: true,
      data: (data ?? []).map((row) => normalizeLayerPackRow(row as Record<string, unknown>)),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Packs konnten nicht geladen werden.",
    };
  }
}

export async function getLayerPack(
  packId: string,
): Promise<ActionResult<{ pack: StudioLayerPack; items: StudioLayerPackItem[] }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };
    const items = await fetchPackItems(supabase, packId);
    return { success: true, data: { pack, items } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Pack konnte nicht geladen werden.",
    };
  }
}

export async function createLayerPack(input: {
  layer: StudioLayer;
  name: string;
  city_id?: string | null;
  city_slug?: string | null;
  language?: StudioLanguage;
  slot_count?: number;
}): Promise<ActionResult<StudioLayerPack>> {
  try {
    if (!isStudioLayer(input.layer)) {
      return { success: false, error: "Ungültiger Layer." };
    }
    const name = input.name.trim();
    if (!name) return { success: false, error: "Bitte einen Namen eingeben." };

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const slug = await ensureUniquePackSlug(supabase, orgId, input.layer, name);
    const city = input.layer === 1 ? await getOwnedCity(supabase, orgId, input.city_id) : null;
    if (input.layer === 1 && input.city_id && !city) {
      return { success: false, error: "Stadt kommt nur aus Exitmania — bitte dort anlegen und hier suchen." };
    }

    const { data, error } = await supabase
      .from("studio_layer_packs")
      .insert({
        organization_id: orgId,
        layer: input.layer,
        slug,
        name,
        city_id: city?.id ?? null,
        city_slug: city?.slug ?? null,
        language: parseStudioLanguage(input.language),
        slot_count: 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    revalidatePacks();
    return { success: true, data: normalizeLayerPackRow(data as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Pack konnte nicht erstellt werden.",
    };
  }
}

async function insertPackItems(
  supabase: AdminClient,
  packId: string,
  rows: Array<{ task_id: string; sort_order: number; overrides: Record<string, unknown> }>,
) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("studio_layer_pack_items").insert(
    rows.map((row) => ({
      pack_id: packId,
      task_id: row.task_id,
      sort_order: row.sort_order,
      overrides: row.overrides,
    })),
  );
  if (error) throw new Error(error.message);
  await refreshPackSlotCount(supabase, packId);
}

export async function updateLayerPack(input: {
  id: string;
  name?: string;
  description?: string;
  city_id?: string | null;
  city_slug?: string | null;
}): Promise<ActionResult<StudioLayerPack>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, input.id);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) return { success: false, error: "Bitte einen Namen eingeben." };
      payload.name = name;
    }
    if (input.description !== undefined) payload.description = input.description.trim();
    if (pack.layer === 1 && input.city_id !== undefined) {
      if (!input.city_id) {
        payload.city_id = null;
        payload.city_slug = null;
      } else {
        const city = await getOwnedCity(supabase, orgId, input.city_id);
        if (!city) return { success: false, error: "Stadt kommt nur aus Exitmania — bitte dort anlegen und hier suchen." };
        payload.city_id = city.id;
        payload.city_slug = city.slug;
      }
    }

    const { data, error } = await supabase
      .from("studio_layer_packs")
      .update(payload)
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    revalidatePacks();
    return { success: true, data: normalizeLayerPackRow(data as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Pack konnte nicht gespeichert werden.",
    };
  }
}

export async function deleteLayerPack(packId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };

    const { error } = await supabase
      .from("studio_layer_packs")
      .delete()
      .eq("id", packId)
      .eq("organization_id", orgId);
    if (error) throw new Error(error.message);

    revalidatePacks();
    return { success: true, data: { id: packId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Pack konnte nicht gelöscht werden.",
    };
  }
}

export async function addTaskToLayerPack(
  packId: string,
  taskId: string,
  extras?: { bind_slot?: number; role?: BonusAudience; overrides?: Record<string, unknown>; sort_order?: number },
): Promise<ActionResult<StudioLayerPackItem[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };

    const { data: task, error: taskError } = await supabase
      .from("studio_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("is_active", true)
      .maybeSingle();
    if (taskError) throw new Error(taskError.message);
    if (!task) return { success: false, error: "Aufgabe nicht gefunden." };
    const taskLayer = (task as { layer?: number }).layer;
    if (taskLayer === 1 || taskLayer === 2 || taskLayer === 3) {
      if (taskLayer !== pack.layer) {
        return { success: false, error: "Diese Aufgabe gehört zu einem anderen Layer." };
      }
    }

    const { count, error: countError } = await supabase
      .from("studio_layer_pack_items")
      .select("id", { count: "exact", head: true })
      .eq("pack_id", packId);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= PACK_SLOT_MAX) {
      return { success: false, error: `Maximal ${PACK_SLOT_MAX} Stops pro Pack.` };
    }

    let overrides: Record<string, unknown> = { ...(extras?.overrides ?? {}) };
    if (pack.layer === 3) {
      overrides.bind_slot = extras?.bind_slot ?? overrides.bind_slot ?? 0;
      overrides.role = extras?.role ?? overrides.role ?? "gamma";
      if (!overrides.when) overrides.when = { type: "immediate" };
    }
    if (pack.layer === 1) {
      overrides = withFreshStationCode(overrides);
    }

    const { error: insertError } = await supabase.from("studio_layer_pack_items").insert({
      pack_id: packId,
      task_id: taskId,
      sort_order: extras?.sort_order ?? count ?? 0,
      overrides,
    });
    if (insertError) throw new Error(insertError.message);
    await refreshPackSlotCount(supabase, packId);
    revalidatePacks();
    return { success: true, data: await fetchPackItems(supabase, packId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Aufgabe konnte nicht zum Pack hinzugefügt werden.",
    };
  }
}

export async function removeTaskFromLayerPack(
  packId: string,
  itemId: string,
): Promise<ActionResult<StudioLayerPackItem[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };

    const { error } = await supabase
      .from("studio_layer_pack_items")
      .delete()
      .eq("id", itemId)
      .eq("pack_id", packId);
    if (error) throw new Error(error.message);

    const remaining = await fetchPackItems(supabase, packId);
    await Promise.all(
      remaining.map((item, index) =>
        supabase
          .from("studio_layer_pack_items")
          .update({ sort_order: index, updated_at: new Date().toISOString() })
          .eq("id", item.id),
      ),
    );
    await refreshPackSlotCount(supabase, packId);
    revalidatePacks();
    return { success: true, data: await fetchPackItems(supabase, packId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Aufgabe konnte nicht entfernt werden.",
    };
  }
}

export async function reorderLayerPackItems(
  packId: string,
  itemIds: string[],
): Promise<ActionResult<StudioLayerPackItem[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };

    await Promise.all(
      itemIds.map((id, index) =>
        supabase
          .from("studio_layer_pack_items")
          .update({ sort_order: index, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("pack_id", packId),
      ),
    );
    await refreshPackSlotCount(supabase, packId);
    revalidatePacks();
    return { success: true, data: await fetchPackItems(supabase, packId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reihenfolge konnte nicht gespeichert werden.",
    };
  }
}

export async function updateLayer3Item(
  packId: string,
  itemId: string,
  patch: { bind_slot?: number; role?: BonusAudience; when?: ReturnType<typeof parseBonusWhen> },
): Promise<ActionResult<StudioLayerPackItem[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };

    const { data: existing, error: fetchError } = await supabase
      .from("studio_layer_pack_items")
      .select("overrides")
      .eq("id", itemId)
      .eq("pack_id", packId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!existing) return { success: false, error: "Eintrag nicht gefunden." };

    const overrides = { ...((existing.overrides as Record<string, unknown>) ?? {}) };
    if (patch.bind_slot !== undefined) overrides.bind_slot = Math.max(0, Math.floor(patch.bind_slot));
    if (patch.role !== undefined) overrides.role = patch.role;
    if (patch.when !== undefined) overrides.when = patch.when;

    const { error } = await supabase
      .from("studio_layer_pack_items")
      .update({ overrides, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("pack_id", packId);
    if (error) throw new Error(error.message);
    revalidatePacks();
    return { success: true, data: await fetchPackItems(supabase, packId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bonus-Zuordnung konnte nicht gespeichert werden.",
    };
  }
}

export async function updateLayer1ItemGps(
  packId: string,
  itemId: string,
  gps: GpsPin,
): Promise<ActionResult<StudioLayerPackItem[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };
    if (pack.layer !== 1) return { success: false, error: "Koordinaten nur im Stadt-Pack." };

    const pin = parseGpsOverride(gps);
    if (!pin) return { success: false, error: "Bitte gültige Koordinaten eintragen." };

    const { data: existing, error: fetchError } = await supabase
      .from("studio_layer_pack_items")
      .select("overrides")
      .eq("id", itemId)
      .eq("pack_id", packId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!existing) return { success: false, error: "Eintrag nicht gefunden." };

    const overrides = { ...((existing.overrides as Record<string, unknown>) ?? {}), location: pin, gps: pin };
    const { error } = await supabase
      .from("studio_layer_pack_items")
      .update({ overrides, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("pack_id", packId);
    if (error) throw new Error(error.message);
    revalidatePacks();
    return { success: true, data: await fetchPackItems(supabase, packId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Koordinaten konnten nicht gespeichert werden.",
    };
  }
}

export async function updateLayer1ItemStation(
  packId: string,
  itemId: string,
  station: { code?: string; place?: string; name?: string },
): Promise<ActionResult<StudioLayerPackItem[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };
    if (pack.layer !== 1) return { success: false, error: "Stationscodes nur im Stadt-Pack." };

    const code = station.code?.trim()
      ? parseCustomerStationCode(station.code)
      : randomStationAccessCode();
    if (station.code?.trim() && !code) {
      return { success: false, error: "Code: 2–24 Zeichen, nur Buchstaben und Zahlen." };
    }

    const { data: existing, error: fetchError } = await supabase
      .from("studio_layer_pack_items")
      .select("overrides")
      .eq("id", itemId)
      .eq("pack_id", packId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!existing) return { success: false, error: "Eintrag nicht gefunden." };

    const previous = (existing.overrides as Record<string, unknown>) ?? {};
    const prevStation =
      previous.station && typeof previous.station === "object"
        ? (previous.station as Record<string, unknown>)
        : {};
    const overrides = {
      ...previous,
      station: {
        ...prevStation,
        code,
        ...(station.place !== undefined ? { place: station.place } : {}),
        ...(station.name !== undefined ? { name: station.name } : {}),
      },
    };
    const { error } = await supabase
      .from("studio_layer_pack_items")
      .update({ overrides, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("pack_id", packId);
    if (error) throw new Error(error.message);
    revalidatePacks();
    return { success: true, data: await fetchPackItems(supabase, packId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Stationscode konnte nicht gespeichert werden.",
    };
  }
}

export async function listPackStationCodes(
  packId: string,
): Promise<ActionResult<{ packName: string; cards: Array<{ index: number; title: string; code: string }> }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };
    if (pack.layer !== 1) return { success: false, error: "Codes gibt es nur im Stadt-Pack." };
    const items = await fetchPackItems(supabase, packId);
    const cards = items.map((item, index) => {
      const station = parsePackItemStation(item.overrides);
      return {
        index: index + 1,
        title: item.task.title,
        code: station?.code?.trim() || randomStationAccessCode(),
      };
    });
    return { success: true, data: { packName: pack.name, cards } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Codes konnten nicht geladen werden.",
    };
  }
}

export async function getTasksBlastRadius(
  taskIds: string[],
): Promise<ActionResult<Record<string, { packCount: number; gameCount: number }>>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const unique = [...new Set(taskIds.filter(Boolean))].slice(0, 80);
    if (unique.length === 0) return { success: true, data: {} };

    const { data: itemRows, error: itemError } = await supabase
      .from("studio_layer_pack_items")
      .select("task_id, pack_id")
      .in("task_id", unique);
    if (itemError) throw new Error(itemError.message);

    const packIdsByTask = new Map<string, Set<string>>();
    for (const row of itemRows ?? []) {
      const taskId = row.task_id as string;
      const packId = row.pack_id as string;
      const set = packIdsByTask.get(taskId) ?? new Set<string>();
      set.add(packId);
      packIdsByTask.set(taskId, set);
    }

    const allPackIds = [...new Set([...packIdsByTask.values()].flatMap((set) => [...set]))];
    const gameCountByPack = new Map<string, number>();
    if (allPackIds.length > 0) {
      const { data: games, error: gameError } = await supabase
        .from("studio_games")
        .select("id, layer1_pack_id, layer2_pack_id, layer3_pack_id")
        .eq("organization_id", orgId)
        .or(
          `layer1_pack_id.in.(${allPackIds.join(",")}),layer2_pack_id.in.(${allPackIds.join(",")}),layer3_pack_id.in.(${allPackIds.join(",")})`,
        );
      if (gameError) throw new Error(gameError.message);
      for (const game of games ?? []) {
        for (const packId of [game.layer1_pack_id, game.layer2_pack_id, game.layer3_pack_id]) {
          if (typeof packId === "string" && allPackIds.includes(packId)) {
            gameCountByPack.set(packId, (gameCountByPack.get(packId) ?? 0) + 1);
          }
        }
      }
    }

    const data: Record<string, { packCount: number; gameCount: number }> = {};
    for (const taskId of unique) {
      const packs = packIdsByTask.get(taskId) ?? new Set();
      let gameCount = 0;
      for (const packId of packs) gameCount += gameCountByPack.get(packId) ?? 0;
      data[taskId] = { packCount: packs.size, gameCount };
    }
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reichweite konnte nicht geladen werden.",
    };
  }
}

function parsePackItemStation(overrides: Record<string, unknown>): { code?: string } | null {
  const raw = overrides.station;
  if (!raw || typeof raw !== "object") return null;
  const code = (raw as { code?: unknown }).code;
  return { code: typeof code === "string" ? code : undefined };
}

const INSERT_CHUNK = 200;

type ClonedTaskMeta = { title: string; description: string; content: StudioTask["content"] };

function mintUniqueSlug(base: string, taken: Set<string>): string {
  const root = (slugifyStudio(base) || "copy").slice(0, 48) || "copy";
  let candidate = root.slice(0, 64);
  let n = 2;
  while (candidate.length < 2 || taken.has(candidate)) {
    const suffix = `-${n}`;
    candidate = `${root.slice(0, Math.max(2, 64 - suffix.length))}${suffix}`;
    n += 1;
    if (n > 20_000) {
      candidate = `${root.slice(0, 40)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`.slice(0, 64);
      break;
    }
  }
  taken.add(candidate);
  return candidate;
}

async function loadSlugPage(
  query: PromiseLike<{ data: Array<{ slug?: string | null }> | null; error: { message: string } | null }>,
  taken: Set<string>,
): Promise<number> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    if (typeof row.slug === "string" && row.slug) taken.add(row.slug);
  }
  return data?.length ?? 0;
}

async function loadTaskSlugs(supabase: AdminClient, orgId: string): Promise<Set<string>> {
  const taken = new Set<string>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const count = await loadSlugPage(
      supabase.from("studio_tasks").select("slug").eq("organization_id", orgId).range(from, from + page - 1),
      taken,
    );
    if (count < page) break;
  }
  return taken;
}

async function loadPackSlugs(
  supabase: AdminClient,
  orgId: string,
  layer: StudioLayer,
): Promise<Set<string>> {
  const taken = new Set<string>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const count = await loadSlugPage(
      supabase
        .from("studio_layer_packs")
        .select("slug")
        .eq("organization_id", orgId)
        .eq("layer", layer)
        .range(from, from + page - 1),
      taken,
    );
    if (count < page) break;
  }
  return taken;
}

async function insertChunks<T extends Record<string, unknown>>(
  insert: (rows: T[]) => PromiseLike<{ error: { message: string } | null }>,
  rows: T[],
): Promise<void> {
  for (let index = 0; index < rows.length; index += INSERT_CHUNK) {
    const { error } = await insert(rows.slice(index, index + INSERT_CHUNK));
    if (error) throw new Error(error.message);
  }
}

async function loadSourceTasks(supabase: AdminClient, taskIds: string[]): Promise<Map<string, StudioTask>> {
  const unique = [...new Set(taskIds.filter(Boolean))];
  const map = new Map<string, StudioTask>();
  for (let index = 0; index < unique.length; index += 80) {
    const chunk = unique.slice(index, index + 80);
    const { data, error } = await supabase.from("studio_tasks").select("*").in("id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const task = mapStudioTaskRow(row as Record<string, unknown>);
      map.set(task.id, task);
    }
  }
  return map;
}

function taskCloneInsert(
  source: StudioTask,
  orgId: string,
  id: string,
  slug: string,
  citySlug?: string | null,
) {
  const content = normalizeTaskContent(source.content);
  return {
    id,
    organization_id: source.organization_id ?? orgId,
    slug,
    title: source.title,
    description: source.description,
    language: source.language,
    city_slug: citySlug ?? source.city_slug,
    game_type: source.game_type,
    tags: source.tags ?? [],
    content,
    layer: source.layer ?? 1,
    content_context: source.content_context ?? "any",
    role_assignment: source.role_assignment ?? "team",
    is_active: true,
  };
}

async function cloneTaskIds(
  supabase: AdminClient,
  orgId: string,
  taskIds: string[],
  citySlug?: string | null,
): Promise<{
  idMap: Map<string, string>;
  cloned: Map<string, ClonedTaskMeta>;
}> {
  const unique = [...new Set(taskIds.filter(Boolean))];
  const idMap = new Map<string, string>();
  const cloned = new Map<string, ClonedTaskMeta>();
  if (unique.length === 0) return { idMap, cloned };

  const sources = await loadSourceTasks(supabase, unique);
  const taken = await loadTaskSlugs(supabase, orgId);
  const rows: ReturnType<typeof taskCloneInsert>[] = [];
  for (const taskId of unique) {
    const source = sources.get(taskId);
    if (!source) throw new Error("Aufgabe zum Kopieren nicht gefunden.");
    const id = crypto.randomUUID();
    const row = taskCloneInsert(source, orgId, id, mintUniqueSlug(source.title, taken), citySlug);
    rows.push(row);
    idMap.set(taskId, id);
    cloned.set(id, { title: source.title, description: source.description ?? "", content: row.content });
  }
  await insertChunks((chunk) => supabase.from("studio_tasks").insert(chunk), rows);
  return { idMap, cloned };
}

function remapPackItemTaskIds(
  source: Record<string, unknown>,
  idMap: Map<string, string>,
  cloned: Map<string, { title: string; description: string; content: StudioTask["content"] }>,
  freshCity = false,
): Record<string, unknown> {
  const next = freshCity ? sharedLayer1ItemOverrides(source) : { ...source };
  for (const key of ["opener_task_id", "geo_task_id", "bonus_task_id"] as const) {
    const current = next[key];
    if (typeof current === "string" && idMap.has(current)) {
      next[key] = idMap.get(current);
    }
  }
  const trigger =
    next.trigger && typeof next.trigger === "object" ? { ...(next.trigger as Record<string, unknown>) } : null;
  if (trigger && typeof trigger.source_task_id === "string" && idMap.has(trigger.source_task_id)) {
    trigger.source_task_id = idMap.get(trigger.source_task_id);
    next.trigger = trigger;
  }
  if (Array.isArray(next.bonus_bindings)) {
    next.bonus_bindings = next.bonus_bindings.map((binding) => {
      if (!binding || typeof binding !== "object") return binding;
      const row = { ...(binding as Record<string, unknown>) };
      if (typeof row.task_id === "string" && idMap.has(row.task_id)) {
        row.task_id = idMap.get(row.task_id);
      }
      return row;
    });
  }
  const openerId = typeof next.opener_task_id === "string" ? next.opener_task_id : null;
  const opener = openerId ? cloned.get(openerId) : null;
  if (opener) {
    const quiz = taskToOpenerArrivalQuiz(
      {
        title: opener.title,
        description: opener.description,
        content: opener.content,
      },
      typeof next.opener_points === "number" ? next.opener_points : null,
    );
    if (quiz) next.arrival_quiz = quiz;
  }
  return next;
}

function packItemTaskIds(items: StudioLayerPackItem[], layer: StudioLayer): string[] {
  const ids: string[] = [];
  for (const item of items) {
    ids.push(item.task_id);
    if (layer !== 1) continue;
    const overrides = item.overrides as { opener_task_id?: unknown; geo_task_id?: unknown };
    if (typeof overrides.opener_task_id === "string") ids.push(overrides.opener_task_id);
    if (typeof overrides.geo_task_id === "string") ids.push(overrides.geo_task_id);
  }
  return ids;
}

type PackCopySpec = {
  name: string;
  city?: { id: string; slug: string } | null;
};

async function duplicatePackCopies(
  supabase: AdminClient,
  orgId: string,
  source: StudioLayerPack,
  copies: PackCopySpec[],
): Promise<string[]> {
  if (copies.length === 0) return [];

  const items = await fetchPackItems(supabase, source.id);
  const sourceTaskIds = packItemTaskIds(items, source.layer);
  const sources = await loadSourceTasks(supabase, sourceTaskIds);
  for (const taskId of [...new Set(sourceTaskIds)]) {
    if (!sources.has(taskId)) throw new Error("Aufgabe zum Kopieren nicht gefunden.");
  }

  const [taskSlugs, packSlugs] = await Promise.all([
    sourceTaskIds.length > 0 ? loadTaskSlugs(supabase, orgId) : Promise.resolve(new Set<string>()),
    loadPackSlugs(supabase, orgId, source.layer),
  ]);

  const packRows: Array<{
    id: string;
    organization_id: string;
    layer: StudioLayer;
    slug: string;
    name: string;
    description: string;
    city_id: string | null;
    city_slug: string | null;
    language: StudioLayerPack["language"];
    translations: Record<string, unknown>;
    slot_count: number;
    created_from_pack_id: string;
  }> = [];
  const taskRows: ReturnType<typeof taskCloneInsert>[] = [];
  const itemRows: Array<{
    pack_id: string;
    task_id: string;
    sort_order: number;
    overrides: Record<string, unknown>;
  }> = [];
  const createdIds: string[] = [];

  for (const copy of copies) {
    const packId = crypto.randomUUID();
    const cityId = source.layer === 1 ? copy.city?.id ?? source.city_id : null;
    const citySlug = source.layer === 1 ? copy.city?.slug ?? source.city_slug : null;
    const idMap = new Map<string, string>();
    const cloned = new Map<string, ClonedTaskMeta>();

    for (const taskId of [...new Set(sourceTaskIds)]) {
      const task = sources.get(taskId)!;
      const newId = crypto.randomUUID();
      const row = taskCloneInsert(task, orgId, newId, mintUniqueSlug(task.title, taskSlugs), citySlug);
      taskRows.push(row);
      idMap.set(taskId, newId);
      cloned.set(newId, {
        title: task.title,
        description: task.description ?? "",
        content: row.content,
      });
    }

    packRows.push({
      id: packId,
      organization_id: orgId,
      layer: source.layer,
      slug: mintUniqueSlug(copy.name, packSlugs),
      name: copy.name,
      description: source.description,
      city_id: cityId,
      city_slug: citySlug,
      language: source.language,
      translations: source.translations,
      slot_count: items.length,
      created_from_pack_id: source.id,
    });
    createdIds.push(packId);

    for (const [index, item] of items.entries()) {
      itemRows.push({
        pack_id: packId,
        task_id: idMap.get(item.task_id) ?? item.task_id,
        sort_order: item.sort_order ?? index,
        overrides: remapPackItemTaskIds(item.overrides, idMap, cloned, source.layer === 1),
      });
    }
  }

  await insertChunks((chunk) => supabase.from("studio_tasks").insert(chunk), taskRows);
  await insertChunks((chunk) => supabase.from("studio_layer_packs").insert(chunk), packRows);
  await insertChunks((chunk) => supabase.from("studio_layer_pack_items").insert(chunk), itemRows);
  return createdIds;
}

export async function duplicateLayerPacks(
  packIds: string[],
  count: number,
): Promise<ActionResult<{ createdIds: string[]; createdCount: number }>> {
  try {
    const copies = Math.min(DUPLICATE_PACKS_MAX, Math.max(1, Math.floor(count)));
    const uniqueIds = [...new Set(packIds.filter(Boolean))];
    if (uniqueIds.length === 0) return { success: false, error: "Keine Packs ausgewählt." };

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const createdIds: string[] = [];

    for (const packId of uniqueIds) {
      const source = await getOwnedPack(supabase, orgId, packId);
      if (!source) continue;
      const specs = Array.from({ length: copies }, (_, index) => ({
        name: `COPY ${index + 1} ${source.name}`,
      }));
      createdIds.push(...(await duplicatePackCopies(supabase, orgId, source, specs)));
    }

    if (createdIds.length === 0) return { success: false, error: "Keine Packs zum Duplizieren gefunden." };
    revalidatePacks();
    return { success: true, data: { createdIds, createdCount: createdIds.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Packs konnten nicht dupliziert werden.",
    };
  }
}

/** Clone shared pack tasks so a title save does not rewrite the source pack. */
async function ownPackTasks(
  packId: string,
): Promise<ActionResult<{ pack: StudioLayerPack; items: StudioLayerPackItem[] }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };

    const items = await fetchPackItems(supabase, pack.id);
    if (items.length === 0) {
      return { success: true, data: { pack, items } };
    }

    const { data: usage, error: usageError } = await supabase
      .from("studio_layer_pack_items")
      .select("task_id, pack_id")
      .in("task_id", packItemTaskIds(items, pack.layer));
    if (usageError) throw new Error(usageError.message);

    const sharedIds = new Set<string>();
    for (const row of usage ?? []) {
      if ((row.pack_id as string) !== pack.id) sharedIds.add(row.task_id as string);
    }
    if (sharedIds.size === 0) {
      return { success: true, data: { pack, items } };
    }

    const { idMap, cloned } = await cloneTaskIds(supabase, orgId, [...sharedIds], pack.city_slug);
    for (const item of items) {
      const nextTaskId = idMap.get(item.task_id) ?? item.task_id;
      const overrides = remapPackItemTaskIds(item.overrides, idMap, cloned, false);
      const { error } = await supabase
        .from("studio_layer_pack_items")
        .update({
          task_id: nextTaskId,
          overrides,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("pack_id", pack.id);
      if (error) throw new Error(error.message);
    }

    revalidatePacks();
    const nextItems = await fetchPackItems(supabase, pack.id);
    return { success: true, data: { pack, items: nextItems } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Aufgaben konnten nicht für diesen Bestandteil kopiert werden.",
    };
  }
}

export async function updatePackItemTaskTitle(
  packId: string,
  itemId: string,
  title: string,
): Promise<ActionResult<StudioLayerPackItem[]>> {
  try {
    const trimmed = title.trim();
    if (!trimmed) return { success: false, error: "Bitte einen Aufgabennamen eingeben." };
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const pack = await getOwnedPack(supabase, orgId, packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };

    const items = await fetchPackItems(supabase, pack.id);
    const item = items.find((row) => row.id === itemId);
    if (!item) return { success: false, error: "Stop nicht gefunden." };

    const { count, error: countError } = await supabase
      .from("studio_layer_pack_items")
      .select("id", { count: "exact", head: true })
      .eq("task_id", item.task_id)
      .neq("pack_id", pack.id);
    if (countError) throw new Error(countError.message);
    let taskId = item.task_id;
    if ((count ?? 0) > 0) {
      const owned = await ownPackTasks(packId);
      if (!owned.success) return { success: false, error: owned.error };
      const ownedItem = owned.data?.items.find((row) => row.id === itemId);
      if (!ownedItem) return { success: false, error: "Stop nach dem Kopieren nicht gefunden." };
      taskId = ownedItem.task_id;
    }

    const { error } = await supabase
      .from("studio_tasks")
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("organization_id", orgId);
    if (error) throw new Error(error.message);

    return { success: true, data: await fetchPackItems(supabase, pack.id) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Name konnte nicht gespeichert werden.",
    };
  }
}

export type NewCityInput = {
  city_id: string;
  name?: string;
};

export async function createLayer1PacksForCities(input: {
  cities: NewCityInput[];
  slot_count?: number;
  clone_from_pack_id?: string | null;
}): Promise<ActionResult<{ createdIds: string[]; createdCount: number }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const cities: Array<{ id: string; slug: string; name: string }> = [];
    for (const row of input.cities.slice(0, CREATE_CITIES_MAX)) {
      const city = await getOwnedCity(supabase, orgId, row.city_id);
      if (!city) continue;
      cities.push({ ...city, name: row.name?.trim() || city.name });
    }

    if (cities.length === 0) return { success: false, error: "Bitte mindestens eine Stadt wählen." };

    const createdIds: string[] = [];
    const template = input.clone_from_pack_id
      ? await getOwnedPack(supabase, orgId, input.clone_from_pack_id)
      : null;
    if (input.clone_from_pack_id && (!template || template.layer !== 1)) {
      return { success: false, error: "Vorlage muss ein Stadt-Pack (Layer 1) sein." };
    }

    const slots = Math.min(PACK_SLOT_MAX, Math.max(0, Math.floor(input.slot_count ?? template?.slot_count ?? 10)));

    if (template) {
      createdIds.push(
        ...(await duplicatePackCopies(
          supabase,
          orgId,
          template,
          cities.map((city) => ({ name: city.name, city })),
        )),
      );
    } else {
      for (const city of cities) {
        const created = await createLayerPack({
          layer: 1,
          name: city.name,
          city_id: city.id,
          slot_count: slots || 10,
        });
        if (!created.success) throw new Error(created.error);
        createdIds.push(created.data.id);
      }
    }

    revalidatePacks();
    return { success: true, data: { createdIds, createdCount: createdIds.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Städte konnten nicht angelegt werden.",
    };
  }
}

async function ensureUniqueGameSlug(supabase: AdminClient, organizationId: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateGameSlug();
    const { data } = await supabase
      .from("studio_games")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error("Spiel-Code konnte nicht erzeugt werden.");
}

function composeShellHasContent(game: StudioGame): boolean {
  const flags = (game.feature_flags ?? {}) as Record<string, unknown>;
  const flagUrl = (key: string) => typeof flags[key] === "string" && String(flags[key]).trim().length > 0;
  return Boolean(
    game.logo_url?.trim() ||
      game.description?.trim() ||
      flagUrl("briefing_iframe_url") ||
      flagUrl("faq_iframe_url") ||
      flagUrl("intro_youtube_url"),
  );
}

function textOrFallback(current: unknown, fallback: unknown): string {
  const cur = typeof current === "string" ? current.trim() : "";
  if (cur) return typeof current === "string" ? current : cur;
  return typeof fallback === "string" ? fallback : "";
}

function mergeComposeShell(
  target: StudioGame,
  source: StudioGame,
  runtimeProfiles: ReturnType<typeof parseRuntimeProfiles>,
): Record<string, unknown> {
  const sourceProfiles = parseRuntimeProfiles(source.runtime_profiles);
  const targetFlags = (target.feature_flags ?? {}) as Record<string, unknown>;
  const sourceFlags = (source.feature_flags ?? {}) as Record<string, unknown>;
  const feature_flags: Record<string, unknown> = { ...sourceFlags, ...targetFlags };
  for (const key of ["briefing_iframe_url", "faq_iframe_url", "intro_youtube_url"]) {
    if (!String(targetFlags[key] ?? "").trim() && String(sourceFlags[key] ?? "").trim()) {
      feature_flags[key] = sourceFlags[key];
    }
  }
  return {
    logo_url: target.logo_url?.trim() ? target.logo_url : source.logo_url,
    description: textOrFallback(target.description, source.description),
    farewell_text: textOrFallback(target.farewell_text, source.farewell_text),
    duration_minutes: target.duration_minutes ?? source.duration_minutes,
    feature_flags,
    translations:
      target.translations && Object.keys(target.translations).length > 0
        ? target.translations
        : (source.translations ?? {}),
    logic_rules:
      Array.isArray(target.logic_rules) && target.logic_rules.length > 0
        ? target.logic_rules
        : (source.logic_rules ?? []),
    language: target.language || source.language,
    runtime_profiles: {
      ...runtimeProfiles,
      route_order: sourceProfiles.route_order,
      role_labels: sourceProfiles.role_labels,
    },
  };
}

function composeShellPayload(
  source: StudioGame,
  runtimeProfiles: ReturnType<typeof parseRuntimeProfiles>,
): Record<string, unknown> {
  return mergeComposeShell(
    {
      ...source,
      logo_url: null,
      description: "",
      farewell_text: "",
      duration_minutes: null,
      feature_flags: {},
      translations: {},
      logic_rules: [],
    } as StudioGame,
    source,
    runtimeProfiles,
  );
}

async function findComposeShellSource(
  supabase: AdminClient,
  orgId: string,
  layer2Id: string | null,
  layer3Id: string | null,
  excludeId?: string,
): Promise<StudioGame | null> {
  if (!layer2Id && !layer3Id) return null;
  let query = supabase
    .from("studio_games")
    .select("*")
    .eq("organization_id", orgId)
    .neq("is_template", true)
    .order("created_at", { ascending: true });
  if (layer2Id) query = query.eq("layer2_pack_id", layer2Id);
  else query = query.is("layer2_pack_id", null);
  if (layer3Id) query = query.eq("layer3_pack_id", layer3Id);
  else query = query.is("layer3_pack_id", null);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? [])
    .map((row) => asStudioGame(row as Record<string, unknown>))
    .filter((game) => game.id !== excludeId);
  const original = rows.find((game) => !game.compose_recipe_id && composeShellHasContent(game));
  if (original) return original;
  return rows.find((game) => composeShellHasContent(game)) ?? null;
}

export type RecipeOriginContext = {
  origin: StudioGame | null;
  isSource: boolean;
  recipe: StudioComposeRecipe | null;
};

async function hydrateComposeRecipes(
  supabase: AdminClient,
  rows: Record<string, unknown>[],
): Promise<StudioComposeRecipe[]> {
  const originIds = [
    ...new Set(
      rows
        .map((row) => (typeof row.origin_game_id === "string" ? row.origin_game_id : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const names = new Map<string, string>();
  if (originIds.length > 0) {
    const { data, error } = await supabase.from("studio_games").select("id, name").in("id", originIds);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      names.set(String(row.id), String(row.name ?? ""));
    }
  }
  return rows.map((row) =>
    normalizeComposeRecipeRow(
      row,
      typeof row.origin_game_id === "string" ? names.get(row.origin_game_id) ?? null : null,
    ),
  );
}

async function persistRecipeOrigin(
  supabase: AdminClient,
  orgId: string,
  recipe: StudioComposeRecipe,
  preferred?: StudioGame | null,
): Promise<StudioComposeRecipe> {
  if (recipe.origin_game_id || recipe.archived_at) return recipe;
  let origin = await findComposeShellSource(
    supabase,
    orgId,
    recipe.layer2_pack_id,
    recipe.layer3_pack_id,
  );
  if (!origin && preferred && composeShellHasContent(preferred)) {
    origin = preferred;
  }
  if (!origin) return recipe;
  const { data, error } = await supabase
    .from("studio_compose_recipes")
    .update({ origin_game_id: origin.id, updated_at: new Date().toISOString() })
    .eq("id", recipe.id)
    .eq("organization_id", orgId)
    .select("*")
    .single();
  if (error) {
    if (/origin_game_id|archived_at|schema cache/i.test(error.message)) {
      return { ...recipe, origin_game_id: origin.id, origin_game_name: origin.name };
    }
    throw new Error(error.message);
  }
  return normalizeComposeRecipeRow(data as Record<string, unknown>, origin.name);
}

export async function loadRecipeOriginContext(
  supabase: AdminClient,
  game: StudioGame,
): Promise<RecipeOriginContext> {
  if (game.compose_recipe_id) {
    const recipe = await getOwnedRecipe(supabase, game.organization_id, game.compose_recipe_id);
    if (!recipe) return { origin: null, isSource: false, recipe: null };
    const ensured = await persistRecipeOrigin(supabase, game.organization_id, recipe, game);
    if (ensured.origin_game_id === game.id) {
      return { origin: null, isSource: true, recipe: ensured };
    }
    if (ensured.origin_game_id) {
      const { data, error } = await supabase
        .from("studio_games")
        .select("*")
        .eq("id", ensured.origin_game_id)
        .eq("organization_id", game.organization_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return {
        origin: data ? asStudioGame(data as Record<string, unknown>) : null,
        isSource: false,
        recipe: ensured,
      };
    }
    const found = await findComposeShellSource(
      supabase,
      game.organization_id,
      game.layer2_pack_id,
      game.layer3_pack_id,
    );
    if (found?.id === game.id) {
      return { origin: null, isSource: true, recipe: ensured };
    }
    return { origin: found, isSource: false, recipe: ensured };
  }

  const { data, error } = await supabase
    .from("studio_compose_recipes")
    .select("*")
    .eq("organization_id", game.organization_id)
    .eq("origin_game_id", game.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && !/origin_game_id|archived_at|schema cache/i.test(error.message)) {
    throw new Error(error.message);
  }
  if (!error && data) {
    return {
      origin: null,
      isSource: true,
      recipe: normalizeComposeRecipeRow(data as Record<string, unknown>, null),
    };
  }
  const inferred = await findComposeShellSource(
    supabase,
    game.organization_id,
    game.layer2_pack_id,
    game.layer3_pack_id,
  );
  if (inferred?.id === game.id) {
    return { origin: null, isSource: true, recipe: null };
  }
  return { origin: null, isSource: false, recipe: null };
}

export async function loadRecipeOriginGame(
  supabase: AdminClient,
  game: StudioGame,
): Promise<StudioGame | null> {
  const context = await loadRecipeOriginContext(supabase, game);
  return context.origin;
}

export async function getRecipeOriginGame(gameId: string): Promise<ActionResult<StudioGame | null>> {
  try {
    const context = await getRecipeOriginContext(gameId);
    if (!context.success) return { success: false, error: context.error };
    return { success: true, data: context.data?.origin ?? null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ursprungsspiel konnte nicht geladen werden.",
    };
  }
}

export async function getRecipeOriginContext(gameId: string): Promise<ActionResult<RecipeOriginContext>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { success: false, error: "Spiel nicht gefunden." };
    const game = asStudioGame(data as Record<string, unknown>);
    return { success: true, data: await loadRecipeOriginContext(supabase, game) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ursprungsspiel konnte nicht geladen werden.",
    };
  }
}

export async function fillComposeShellIfEmpty(game: StudioGame): Promise<StudioGame> {
  return game;
}

export async function composeGamesFromPacks(input: {
  name?: string;
  surface?: "outdoor" | "indoor" | "online";
  language?: StudioLanguage;
  layer1_pack_id?: string | null;
  layer2_pack_id?: string | null;
  layer3_pack_id?: string | null;
  layer1_pack_ids?: string[];
  recipe_id?: string | null;
}): Promise<ActionResult<{ createdIds: string[]; createdCount: number; skippedCount: number }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const l1Ids = [
      ...new Set(
        (input.layer1_pack_ids?.length ? input.layer1_pack_ids : input.layer1_pack_id ? [input.layer1_pack_id] : []).filter(
          Boolean,
        ),
      ),
    ].slice(0, COMPOSE_GAMES_MAX);

    if (!input.layer2_pack_id && !input.layer3_pack_id && l1Ids.length === 0) {
      return { success: false, error: "Bitte mindestens ein Pack wählen." };
    }

    const surface = input.surface === "indoor" || input.surface === "online" ? input.surface : "outdoor";
    const preset = surfaceToPreset(surface);
    const runtime_profiles = {
      ...DEFAULT_RUNTIME_PROFILES,
      default_mode: preset.defaultMode,
      allowed_fallbacks: [...preset.allowedFallbacks],
      indoor_one_click: preset.allowedFallbacks.includes("indoor"),
    };

    const mission = input.layer2_pack_id ? await getOwnedPack(supabase, orgId, input.layer2_pack_id) : null;
    const team = input.layer3_pack_id ? await getOwnedPack(supabase, orgId, input.layer3_pack_id) : null;
    if (input.layer2_pack_id && !mission) return { success: false, error: "Missions-Pack nicht gefunden." };
    if (input.layer3_pack_id && !team) return { success: false, error: "Team-Pack nicht gefunden." };

    let recipeId = input.recipe_id ?? null;
    let recipe: StudioComposeRecipe | null = null;
    if (recipeId) {
      recipe = await getOwnedRecipe(supabase, orgId, recipeId);
      if (!recipe) return { success: false, error: "Rezept nicht gefunden." };
      if (recipe.archived_at) {
        return { success: false, error: "Dieses Rezept ist archiviert. Neue Spiele legt du damit nicht mehr an." };
      }
    }

    const cityPacks: StudioLayerPack[] = [];
    if (l1Ids.length > 0) {
      const found = new Map<string, StudioLayerPack>();
      for (let index = 0; index < l1Ids.length; index += 80) {
        const chunk = l1Ids.slice(index, index + 80);
        const { data, error } = await supabase
          .from("studio_layer_packs")
          .select("*")
          .eq("organization_id", orgId)
          .eq("layer", 1)
          .in("id", chunk);
        if (error) throw new Error(error.message);
        for (const row of data ?? []) {
          const pack = normalizeLayerPackRow(row as Record<string, unknown>);
          found.set(pack.id, pack);
        }
      }
      for (const packId of l1Ids) {
        const pack = found.get(packId);
        if (!pack) return { success: false, error: "Stadt-Pack nicht gefunden." };
        cityPacks.push(pack);
      }
    }

    const existingByL1 = new Map<string, StudioGame>();
    if (cityPacks.length > 0) {
      for (let index = 0; index < cityPacks.length; index += 80) {
        const chunk = cityPacks.slice(index, index + 80);
        const { data: existing, error: existingError } = await supabase
          .from("studio_games")
          .select("*")
          .eq("organization_id", orgId)
          .in(
            "layer1_pack_id",
            chunk.map((pack) => pack.id),
          );
        if (existingError) throw new Error(existingError.message);
        for (const row of existing ?? []) {
          const game = asStudioGame(row as Record<string, unknown>);
          if (
            (game.layer2_pack_id ?? null) === (mission?.id ?? null) &&
            (game.layer3_pack_id ?? null) === (team?.id ?? null)
          ) {
            existingByL1.set(game.layer1_pack_id as string, game);
          }
        }
      }
    }

    const targets = cityPacks.length > 0 ? cityPacks : [null];
    const createdIds: string[] = [];
    const createdMeta: Array<{ id: string; citySlug: string | null; cityName: string }> = [];
    let skippedCount = 0;
    const language = parseStudioLanguage(input.language);
    const packItems = await fetchPackItemsByIds(supabase, [
      ...cityPacks.map((pack) => pack.id),
      ...(mission?.id ? [mission.id] : []),
      ...(team?.id ? [team.id] : []),
    ]);

    if (surface === "indoor") {
      for (const city of cityPacks) {
        await ensureLayer1StationCodes(supabase, city.id);
      }
    }

    for (const city of targets) {
      if (city && existingByL1.has(city.id)) {
        skippedCount += 1;
        continue;
      }
      const slug = await ensureUniqueGameSlug(supabase, orgId);
      const name =
        input.name?.trim() && cityPacks.length <= 1
          ? input.name.trim()
          : composeGameName(city?.name ?? city?.city_slug, mission?.name) ||
            input.name?.trim() ||
            "Neues Spiel";
      const draft = composeDraftGame({
        organization_id: orgId,
        slug,
        name,
        language,
        city_slug: city?.city_slug ?? null,
        gps_enabled: preset.gpsEnabled,
        active_layers: [...preset.activeLayers],
        runtime_profiles,
        layer1_pack_id: city?.id ?? input.layer1_pack_id ?? null,
        layer2_pack_id: mission?.id ?? null,
        layer3_pack_id: team?.id ?? null,
        compose_recipe_id: recipeId,
      });
      const links = mergePackLinksOntoGame({
        game: draft,
        legacyLinks: [],
        packs: {
          1: city?.id ? packItems.get(city.id) : undefined,
          2: mission?.id ? packItems.get(mission.id) : undefined,
          3: team?.id ? packItems.get(team.id) : undefined,
        },
      });
      const translations = seedCityShellTranslations(draft, links);
      const { data, error } = await supabase
        .from("studio_games")
        .insert({
          organization_id: orgId,
          blueprint_id: null,
          slug,
          name,
          description: "",
          language,
          translations,
          city_slug: city?.city_slug ?? null,
          gps_enabled: preset.gpsEnabled,
          active_layers: [...preset.activeLayers],
          runtime_profiles,
          feature_flags: {},
          logic_rules: [],
          status: "draft",
          layer1_pack_id: city?.id ?? input.layer1_pack_id ?? null,
          layer2_pack_id: mission?.id ?? null,
          layer3_pack_id: team?.id ?? null,
          compose_recipe_id: recipeId,
        })
        .select("id")
        .single();
      if (error) {
        if (/studio_games_layer_combo_key|duplicate key/i.test(error.message)) {
          skippedCount += 1;
          continue;
        }
        throw new Error(error.message);
      }
      createdIds.push(data.id as string);
      createdMeta.push({
        id: data.id as string,
        citySlug: city?.city_slug ?? null,
        cityName: city?.name ?? "",
      });
    }

    if (recipeId && recipe && !recipe.origin_game_id && createdMeta.length > 0) {
      const originId = pickRecipeOriginGameId(createdMeta);
      if (originId) {
        await supabase
          .from("studio_compose_recipes")
          .update({ origin_game_id: originId, updated_at: new Date().toISOString() })
          .eq("id", recipeId)
          .eq("organization_id", orgId);
      }
    }

    revalidatePacks();
    return { success: true, data: { createdIds, createdCount: createdIds.length, skippedCount } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Spiele konnten nicht zusammengesteckt werden.",
    };
  }
}

async function getOwnedRecipe(
  supabase: AdminClient,
  orgId: string,
  recipeId: string,
): Promise<StudioComposeRecipe | null> {
  const { data, error } = await supabase
    .from("studio_compose_recipes")
    .select("*")
    .eq("id", recipeId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (await hydrateComposeRecipes(supabase, [data as Record<string, unknown>]))[0] ?? null : null;
}

export async function listExistingComposeCities(input: {
  layer2_pack_id?: string | null;
  layer3_pack_id?: string | null;
}): Promise<ActionResult<{ layer1PackIds: string[] }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    let query = supabase
      .from("studio_games")
      .select("layer1_pack_id")
      .eq("organization_id", orgId)
      .not("layer1_pack_id", "is", null);
    if (input.layer2_pack_id) query = query.eq("layer2_pack_id", input.layer2_pack_id);
    else query = query.is("layer2_pack_id", null);
    if (input.layer3_pack_id) query = query.eq("layer3_pack_id", input.layer3_pack_id);
    else query = query.is("layer3_pack_id", null);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return {
      success: true,
      data: {
        layer1PackIds: [
          ...new Set(
            (data ?? [])
              .map((row) => row.layer1_pack_id)
              .filter((id): id is string => typeof id === "string"),
          ),
        ],
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bestehende Städte konnten nicht geladen werden.",
    };
  }
}

export async function listComposeRecipes(input?: {
  includeArchived?: boolean;
}): Promise<ActionResult<StudioComposeRecipe[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    let query = supabase
      .from("studio_compose_recipes")
      .select("*")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(80);
    if (!input?.includeArchived) query = query.is("archived_at", null);
    let { data, error } = await query;
    if (error && /archived_at|origin_game_id|schema cache/i.test(error.message)) {
      const fallback = await supabase
        .from("studio_compose_recipes")
        .select("*")
        .eq("organization_id", orgId)
        .order("updated_at", { ascending: false })
        .limit(80);
      data = fallback.data;
      error = fallback.error;
    }
    if (error) throw new Error(error.message);
    const recipes = await hydrateComposeRecipes(supabase, (data ?? []) as Record<string, unknown>[]);
    const next: StudioComposeRecipe[] = [];
    for (const recipe of recipes) {
      next.push(await persistRecipeOrigin(supabase, orgId, recipe));
    }
    return { success: true, data: next };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Rezepte konnten nicht geladen werden.",
    };
  }
}

export async function saveComposeRecipe(input: {
  id?: string;
  name: string;
  layer2_pack_id?: string | null;
  layer3_pack_id?: string | null;
  surface?: "outdoor" | "indoor" | "online";
  language?: StudioLanguage;
  origin_game_id?: string | null;
}): Promise<ActionResult<StudioComposeRecipe>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const name = input.name.trim();
    if (name.length < 2) return { success: false, error: "Bitte einen Rezept-Namen eingeben." };
    const surface = input.surface === "indoor" || input.surface === "online" ? input.surface : "outdoor";
    const payload: Record<string, unknown> = {
      name,
      layer2_pack_id: input.layer2_pack_id ?? null,
      layer3_pack_id: input.layer3_pack_id ?? null,
      surface,
      language: parseStudioLanguage(input.language),
      updated_at: new Date().toISOString(),
    };
    if (input.origin_game_id !== undefined) payload.origin_game_id = input.origin_game_id;
    if (input.id) {
      const existing = await getOwnedRecipe(supabase, orgId, input.id);
      if (!existing) return { success: false, error: "Rezept nicht gefunden." };
      if (existing.archived_at) return { success: false, error: "Archivierte Rezepte werden nicht mehr geändert." };
      const { data, error } = await supabase
        .from("studio_compose_recipes")
        .update(payload)
        .eq("id", input.id)
        .eq("organization_id", orgId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      const recipe = (await hydrateComposeRecipes(supabase, [data as Record<string, unknown>]))[0]!;
      return { success: true, data: await persistRecipeOrigin(supabase, orgId, recipe) };
    }
    if (!payload.origin_game_id) {
      const origin = await findComposeShellSource(
        supabase,
        orgId,
        input.layer2_pack_id ?? null,
        input.layer3_pack_id ?? null,
      );
      if (origin) payload.origin_game_id = origin.id;
    }
    const { data, error } = await supabase
      .from("studio_compose_recipes")
      .insert({ organization_id: orgId, ...payload })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    revalidatePacks();
    const recipe = (await hydrateComposeRecipes(supabase, [data as Record<string, unknown>]))[0]!;
    return { success: true, data: await persistRecipeOrigin(supabase, orgId, recipe) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Rezept konnte nicht gespeichert werden.",
    };
  }
}

export async function archiveComposeRecipe(recipeId: string): Promise<ActionResult<StudioComposeRecipe>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const existing = await getOwnedRecipe(supabase, orgId, recipeId);
    if (!existing) return { success: false, error: "Rezept nicht gefunden." };
    const { data, error } = await supabase
      .from("studio_compose_recipes")
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", recipeId)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    revalidatePacks();
    const recipe = (await hydrateComposeRecipes(supabase, [data as Record<string, unknown>]))[0]!;
    return { success: true, data: recipe };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Rezept konnte nicht archiviert werden.",
    };
  }
}

export async function setComposeRecipeOrigin(
  recipeId: string,
  gameId: string,
): Promise<ActionResult<StudioComposeRecipe>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const recipe = await getOwnedRecipe(supabase, orgId, recipeId);
    if (!recipe) return { success: false, error: "Rezept nicht gefunden." };
    if (recipe.archived_at) return { success: false, error: "Archivierte Rezepte werden nicht mehr geändert." };
    const { data: game, error: gameError } = await supabase
      .from("studio_games")
      .select("id, name")
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (gameError) throw new Error(gameError.message);
    if (!game) return { success: false, error: "Spiel nicht gefunden." };
    const { data, error } = await supabase
      .from("studio_compose_recipes")
      .update({ origin_game_id: gameId, updated_at: new Date().toISOString() })
      .eq("id", recipeId)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    revalidatePacks();
    const next = (await hydrateComposeRecipes(supabase, [data as Record<string, unknown>]))[0]!;
    return { success: true, data: next };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Hauptspiel konnte nicht gesetzt werden.",
    };
  }
}

export async function swapRecipeLayer(
  recipeId: string,
  patch: { layer2_pack_id?: string | null; layer3_pack_id?: string | null },
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const recipe = await getOwnedRecipe(supabase, orgId, recipeId);
    if (!recipe) return { success: false, error: "Rezept nicht gefunden." };
    if (recipe.archived_at) return { success: false, error: "Archivierte Rezepte werden nicht mehr geändert." };

    const nextL2 = patch.layer2_pack_id !== undefined ? patch.layer2_pack_id : recipe.layer2_pack_id;
    const nextL3 = patch.layer3_pack_id !== undefined ? patch.layer3_pack_id : recipe.layer3_pack_id;
    if (nextL2) {
      const pack = await getOwnedPack(supabase, orgId, nextL2);
      if (!pack || pack.layer !== 2) return { success: false, error: "Missions-Pack nicht gefunden." };
    }
    if (nextL3) {
      const pack = await getOwnedPack(supabase, orgId, nextL3);
      if (!pack || pack.layer !== 3) return { success: false, error: "Team-Pack nicht gefunden." };
    }

    const { error: recipeError } = await supabase
      .from("studio_compose_recipes")
      .update({
        layer2_pack_id: nextL2,
        layer3_pack_id: nextL3,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId)
      .eq("organization_id", orgId);
    if (recipeError) throw new Error(recipeError.message);

    const { data, error } = await supabase
      .from("studio_games")
      .update({
        layer2_pack_id: nextL2,
        layer3_pack_id: nextL3,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", orgId)
      .eq("compose_recipe_id", recipeId)
      .select("id");
    if (error) throw new Error(error.message);

    revalidatePacks();
    return { success: true, data: { updatedCount: data?.length ?? 0 } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Layer konnte nicht getauscht werden.",
    };
  }
}

function pickRecipeOriginGameId(
  created: Array<{ id: string; citySlug: string | null; cityName: string }>,
): string | null {
  const munich = created.find((row) => {
    const slug = (row.citySlug ?? "").trim().toLowerCase();
    const name = row.cityName.trim().toLowerCase();
    return slug === "muenchen" || slug === "munich" || name.includes("münchen") || name.includes("muenchen") || name.includes("munich");
  });
  return munich?.id ?? created[0]?.id ?? null;
}

function composeDraftGame(input: {
  organization_id: string;
  slug: string;
  name: string;
  language: StudioLanguage;
  city_slug: string | null;
  gps_enabled: boolean;
  active_layers: StudioGame["active_layers"];
  runtime_profiles: StudioGame["runtime_profiles"];
  layer1_pack_id: string | null;
  layer2_pack_id: string | null;
  layer3_pack_id: string | null;
  compose_recipe_id: string | null;
}): StudioGame {
  return {
    id: "compose-draft",
    organization_id: input.organization_id,
    blueprint_id: null,
    slug: input.slug,
    name: input.name,
    logo_url: null,
    description: "",
    language: input.language,
    translations: {},
    city_slug: input.city_slug,
    duration_minutes: null,
    gps_enabled: input.gps_enabled,
    farewell_text: "",
    feature_flags: {},
    logic_rules: [],
    active_layers: input.active_layers,
    runtime_profiles: input.runtime_profiles,
    layer1_pack_id: input.layer1_pack_id,
    layer2_pack_id: input.layer2_pack_id,
    layer3_pack_id: input.layer3_pack_id,
    compose_recipe_id: input.compose_recipe_id,
    status: "draft",
    published_version_number: 0,
    is_template: false,
    created_at: "",
    updated_at: "",
  };
}

function asStudioGame(row: Record<string, unknown>): StudioGame {
  return {
    ...(row as unknown as StudioGame),
    layer1_pack_id: (row.layer1_pack_id as string | null) ?? null,
    layer2_pack_id: (row.layer2_pack_id as string | null) ?? null,
    layer3_pack_id: (row.layer3_pack_id as string | null) ?? null,
    compose_recipe_id: (row.compose_recipe_id as string | null) ?? null,
  };
}

async function ensureLayer1StationCodes(supabase: AdminClient, packId: string) {
  const items = await fetchPackItems(supabase, packId);
  for (const item of items) {
    const next = withFreshStationCode(item.overrides);
    if (JSON.stringify(next) === JSON.stringify(item.overrides)) continue;
    await writePackItemOverrides(supabase, packId, item.id, next);
  }
}

async function writePackItemOverrides(
  supabase: AdminClient,
  packId: string,
  itemId: string,
  overrides: Record<string, unknown>,
  extra?: { task_id?: string },
) {
  const { error } = await supabase
    .from("studio_layer_pack_items")
    .update({
      overrides,
      ...(extra?.task_id ? { task_id: extra.task_id } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("pack_id", packId);
  if (error) throw new Error(error.message);
}

function geoOverridesFromPair(
  layer1: StudioGameTaskLink | undefined,
  layer2: StudioGameTaskLink | undefined,
): Record<string, unknown> {
  const from1 = layer1 ? parseLinkOverrides(layer1.overrides) : {};
  const from2 = layer2 ? parseLinkOverrides(layer2.overrides) : {};
  const gps = from1.gps ?? from1.location ?? from2.gps ?? from2.location;
  const station = from1.station ?? from2.station;
  const unlock = from1.unlock ?? from2.unlock;
  const opener_task_id = from1.opener_task_id ?? from2.opener_task_id ?? layer1?.task_id ?? null;
  const opener_enabled = from1.opener_enabled ?? from2.opener_enabled ?? Boolean(opener_task_id);
  const opener_points = from1.opener_points ?? from2.opener_points;
  const arrival_quiz = from1.arrival_quiz ?? from2.arrival_quiz;
  return {
    ...(gps ? { location: gps, gps } : {}),
    ...(station ? { station } : {}),
    ...(unlock ? { unlock } : {}),
    ...(opener_task_id ? { opener_task_id } : {}),
    opener_enabled,
    ...(typeof opener_points === "number" ? { opener_points } : {}),
    ...(arrival_quiz ? { arrival_quiz } : {}),
  };
}

async function createPackWithItems(
  supabase: AdminClient,
  orgId: string,
  input: {
    layer: StudioLayer;
    name: string;
    city_id?: string | null;
    city_slug?: string | null;
    language: StudioLanguage;
    items: Array<{ task_id: string; sort_order: number; overrides: Record<string, unknown> }>;
  },
): Promise<StudioLayerPack> {
  const slug = await ensureUniquePackSlug(supabase, orgId, input.layer, input.name);
  const { data, error } = await supabase
    .from("studio_layer_packs")
    .insert({
      organization_id: orgId,
      layer: input.layer,
      slug,
      name: input.name,
      city_id: input.layer === 1 ? input.city_id ?? null : null,
      city_slug: input.layer === 1 ? input.city_slug ?? null : null,
      language: input.language,
      slot_count: 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const pack = normalizeLayerPackRow(data as Record<string, unknown>);
  await insertPackItems(supabase, pack.id, input.items);
  const fresh = await getOwnedPack(supabase, orgId, pack.id);
  return fresh ?? pack;
}

export async function saveGameAsLayerPacks(
  gameId: string,
  names?: { layer1?: string; layer2?: string; layer3?: string },
): Promise<ActionResult<StudioGame>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data: gameRow, error: gameError } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (gameError) throw new Error(gameError.message);
    if (!gameRow) return { success: false, error: "Spiel nicht gefunden." };

    const game = asStudioGame(gameRow as Record<string, unknown>);
    if (gameUsesLayerPacks(game)) {
      const rename = async (packId: string | null, name: string | undefined) => {
        const next = name?.trim();
        if (!packId || !next) return;
        const pack = await getOwnedPack(supabase, orgId, packId);
        if (!pack) return;
        const { error } = await supabase
          .from("studio_layer_packs")
          .update({ name: next, updated_at: new Date().toISOString() })
          .eq("id", packId)
          .eq("organization_id", orgId);
        if (error) throw new Error(error.message);
      };
      await rename(game.layer1_pack_id, names?.layer1);
      await rename(game.layer2_pack_id, names?.layer2);
      await rename(game.layer3_pack_id, names?.layer3);
      revalidatePacks();
      return { success: true, data: game };
    }

    const { data: linkRows, error: linksError } = await supabase
      .from("studio_game_tasks")
      .select("id, game_id, task_id, layer, sort_order, overrides, studio_tasks(*)")
      .eq("game_id", gameId)
      .order("sort_order");
    if (linksError) throw new Error(linksError.message);

    const links = (linkRows ?? []).flatMap((row) => {
      const link = mapLegacyLinkRow(row as Record<string, unknown>, gameId);
      return link ? [link] : [];
    });
    if (links.length === 0) {
      return { success: false, error: "Keine Aufgaben in diesem Spiel — zuerst spielbar machen." };
    }

    const layer1 = links.filter((link) => parseLinkLayer(link) === 1);
    const layer2 = links.filter((link) => parseLinkLayer(link) === 2);
    const layer3 = links.filter((link) => parseLinkLayer(link) === 3);
    const language = parseStudioLanguage(game.language);
    const citySlug = game.city_slug ?? null;
    const city = citySlug
      ? (
          await supabase
            .from("cities")
            .select("id, slug, name")
            .eq("organization_id", orgId)
            .eq("slug", citySlug)
            .maybeSingle()
        ).data
      : null;

    const l1Items: Array<{ task_id: string; sort_order: number; overrides: Record<string, unknown> }> = [];
    if (layer1.length > 0) {
      for (const item of layer1) {
        const mission = layer2.find((link) => link.sort_order === item.sort_order) ?? layer2[item.sort_order];
        l1Items.push({
          task_id: item.task_id,
          sort_order: item.sort_order,
          overrides: geoOverridesFromPair(item, mission),
        });
      }
    } else {
      for (const mission of layer2) {
        const openerId = parseLinkOverrides(mission.overrides).opener_task_id;
        if (!openerId) continue;
        l1Items.push({
          task_id: openerId,
          sort_order: mission.sort_order,
          overrides: geoOverridesFromPair(undefined, mission),
        });
      }
    }

    const l1Pack =
      l1Items.length > 0
        ? await createPackWithItems(supabase, orgId, {
            layer: 1,
            name: names?.layer1?.trim() || (typeof city?.name === "string" && city.name.trim()) || citySlug || game.name,
            city_id: typeof city?.id === "string" ? city.id : null,
            city_slug: (typeof city?.slug === "string" && city.slug) || citySlug,
            language,
            items: l1Items,
          })
        : null;
    const l2Pack =
      layer2.length > 0
        ? await createPackWithItems(supabase, orgId, {
            layer: 2,
            name: names?.layer2?.trim() || `${game.name} · Mission`,
            language,
            items: layer2.map((item) => ({
              task_id: item.task_id,
              sort_order: item.sort_order,
              overrides: stripGeoFromMissionOverrides({ ...(item.overrides as Record<string, unknown>) }),
            })),
          })
        : null;
    const l3Pack =
      layer3.length > 0
        ? await createPackWithItems(supabase, orgId, {
            layer: 3,
            name: names?.layer3?.trim() || `${game.name} · Team`,
            language,
            items: layer3.map((item) => {
              const parsed = parseLinkOverrides(item.overrides);
              return {
                task_id: item.task_id,
                sort_order: item.sort_order,
                overrides: {
                  ...item.overrides,
                  bind_slot: (item.overrides as { bind_slot?: number }).bind_slot ?? item.sort_order,
                  ...(parsed.role ? { role: parsed.role } : {}),
                },
              };
            }),
          })
        : null;

    const { data: updated, error: updateError } = await supabase
      .from("studio_games")
      .update({
        layer1_pack_id: l1Pack?.id ?? null,
        layer2_pack_id: l2Pack?.id ?? null,
        layer3_pack_id: l3Pack?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    revalidatePacks();
    return { success: true, data: asStudioGame(updated as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Packs konnten nicht aus dem Spiel erzeugt werden.",
    };
  }
}

export async function savePackBackedGameLink(input: {
  gameId: string;
  linkId: string;
  overrides: Record<string, unknown>;
  openerTaskId?: string | null;
  bonusBindingsTouched?: boolean;
  endsGame?: boolean | null;
}): Promise<ActionResult<StudioGameTaskLink>> {
  try {
    const parsed = parsePackLinkId(input.linkId);
    if (!parsed) return { success: false, error: "Kein Pack-Slot." };

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data: gameRow, error: gameError } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", input.gameId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (gameError) throw new Error(gameError.message);
    if (!gameRow) return { success: false, error: "Spiel nicht gefunden." };
    const game = asStudioGame(gameRow as Record<string, unknown>);

    const pack = await getOwnedPack(supabase, orgId, parsed.packId);
    if (!pack) return { success: false, error: "Pack nicht gefunden." };
    const item = await fetchPackItem(supabase, parsed.itemId);
    if (!item || item.pack_id !== pack.id) {
      return { success: false, error: "Pack-Eintrag nicht gefunden." };
    }

    const split = splitOverridesForLayerPacks(input.overrides);

    if (pack.layer === 1) {
      const geo = { ...item.overrides, ...split.geo };
      if (input.openerTaskId === null) geo.opener_enabled = false;
      if (input.openerTaskId) {
        geo.opener_enabled = true;
        geo.opener_task_id = input.openerTaskId;
      }
      await writePackItemOverrides(
        supabase,
        pack.id,
        item.id,
        geo,
        input.openerTaskId ? { task_id: input.openerTaskId } : undefined,
      );
    } else if (pack.layer === 2) {
      if (game.layer1_pack_id) {
        const sibling = await fetchPackItemAtSort(supabase, game.layer1_pack_id, item.sort_order);
        if (sibling) {
          const geo = { ...sibling.overrides, ...split.geo };
          if (input.openerTaskId === null) geo.opener_enabled = false;
          if (input.openerTaskId) {
            geo.opener_enabled = true;
            geo.opener_task_id = input.openerTaskId;
          }
          await writePackItemOverrides(
            supabase,
            game.layer1_pack_id,
            sibling.id,
            geo,
            input.openerTaskId ? { task_id: input.openerTaskId } : undefined,
          );
        } else if (input.openerTaskId) {
          const geo = { ...split.geo, opener_enabled: true, opener_task_id: input.openerTaskId };
          const added = await addTaskToLayerPack(game.layer1_pack_id, input.openerTaskId, {
            overrides: geo,
            sort_order: item.sort_order,
          });
          if (!added.success) throw new Error(added.error);
        }
      }
      await writePackItemOverrides(
        supabase,
        pack.id,
        item.id,
        stripGeoFromMissionOverrides({ ...item.overrides, ...split.mission }),
      );

      if (input.bonusBindingsTouched && game.layer3_pack_id) {
        const bindings = Array.isArray(input.overrides.bonus_bindings)
          ? (input.overrides.bonus_bindings as Array<{
              task_id: string;
              role?: BonusAudience;
              when?: { type: string };
            }>)
          : [];
        const bindingIds = bindings.map((binding) => binding.task_id).filter(Boolean);
        const layer3Items =
          bindingIds.length > 0
            ? (await fetchPackItems(supabase, game.layer3_pack_id)).filter((row) =>
                bindingIds.includes(row.task_id),
              )
            : [];
        for (const binding of bindings) {
          if (!binding.task_id) continue;
          const existing = layer3Items.find((row) => row.task_id === binding.task_id);
          if (existing) {
            await writePackItemOverrides(supabase, game.layer3_pack_id, existing.id, {
              ...existing.overrides,
              bind_slot: item.sort_order,
              role: binding.role ?? "gamma",
              when: binding.when ?? { type: "immediate" },
            });
          } else {
            const added = await addTaskToLayerPack(game.layer3_pack_id, binding.task_id, {
              bind_slot: item.sort_order,
              role: binding.role ?? "gamma",
              overrides: { when: binding.when ?? { type: "immediate" } },
            });
            if (!added.success) throw new Error(added.error);
          }
        }
      }

      if (input.endsGame) {
        const siblings = await fetchPackItems(supabase, pack.id);
        await Promise.all(
          siblings
            .filter((row) => row.id !== item.id)
            .map(async (row) => {
              if (!(row.overrides as { ends_game?: boolean }).ends_game) return;
              const next = { ...row.overrides };
              delete next.ends_game;
              await writePackItemOverrides(supabase, pack.id, row.id, next);
            }),
        );
      }
    } else {
      await writePackItemOverrides(supabase, pack.id, item.id, {
        ...item.overrides,
        ...input.overrides,
      });
    }

    const written = await fetchPackItem(supabase, item.id);
    if (!written) return { success: false, error: "Slot nach dem Speichern nicht gefunden." };
    const geoItem =
      pack.layer === 2 && game.layer1_pack_id
        ? await fetchPackItemAtSort(supabase, game.layer1_pack_id, written.sort_order)
        : pack.layer === 1
          ? written
          : null;
    const merged = mergePackLinksOntoGame({
      game,
      legacyLinks: [],
      packs: {
        1: geoItem ? [geoItem] : undefined,
        2: pack.layer === 2 ? [written] : undefined,
        3: pack.layer === 3 ? [written] : undefined,
      },
    });
    const link = merged.find((row) => row.id === input.linkId) ?? packItemToGameLink({
      gameId: game.id,
      packId: pack.id,
      item: written,
      layer: pack.layer,
    });
    return { success: true, data: link };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bedingungen konnten nicht im Pack gespeichert werden.",
    };
  }
}

export async function reorderPackBackedGameTasks(
  gameId: string,
  layer: StudioLayer,
  orderedLinkIds: string[],
): Promise<ActionResult<{ count: number }>> {
  try {
    const parsed = orderedLinkIds.map((id) => parsePackLinkId(id));
    if (parsed.some((row) => !row)) {
      return { success: false, error: "Gemischte Pack- und Spiel-Slots lassen sich nicht sortieren." };
    }
    const packId = parsed[0]?.packId;
    if (!packId) return { success: true, data: { count: 0 } };
    if (parsed.some((row) => row?.packId !== packId)) {
      return { success: false, error: "Stops gehören zu unterschiedlichen Packs." };
    }

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data: gameRow } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (!gameRow) return { success: false, error: "Spiel nicht gefunden." };
    const game = asStudioGame(gameRow as Record<string, unknown>);

    const current = await fetchPackItems(supabase, packId);
    const oldIds = current.map((item) => item.id);
    const newItemIds = parsed.map((row) => row!.itemId);
    const reordered = await reorderLayerPackItems(packId, newItemIds);
    if (!reordered.success) return { success: false, error: reordered.error };

    if (layer === 2 && game.layer1_pack_id) {
      const layer1Items = await fetchPackItems(supabase, game.layer1_pack_id);
      if (layer1Items.length === oldIds.length) {
        const permuted = newItemIds
          .map((id) => {
            const oldIndex = oldIds.indexOf(id);
            return oldIndex >= 0 ? layer1Items[oldIndex]?.id : null;
          })
          .filter((id): id is string => Boolean(id));
        if (permuted.length === layer1Items.length) {
          const l1 = await reorderLayerPackItems(game.layer1_pack_id, permuted);
          if (!l1.success) return { success: false, error: l1.error };
        }
      }
    }
    return { success: true, data: { count: orderedLinkIds.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reihenfolge konnte nicht gespeichert werden.",
    };
  }
}
