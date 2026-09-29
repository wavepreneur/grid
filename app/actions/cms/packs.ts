"use server";

import { revalidatePath } from "next/cache";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import { parseBonusWhen, type BonusAudience } from "@/lib/cms/bonus-bindings";
import { parseStudioLanguage, type StudioLanguage } from "@/lib/cms/languages";
import { DEFAULT_RUNTIME_PROFILES, isStudioLayer, type StudioLayer } from "@/lib/cms/layer-model";
import {
  COMPOSE_GAMES_MAX,
  CREATE_CITIES_MAX,
  DUPLICATE_PACKS_MAX,
  PACK_SEARCH_LIMIT,
  PACK_SLOT_MAX,
  gameUsesLayerPacks,
  mapStudioTaskRow,
  mergePackLinksOntoGame,
  normalizeLayerPackRow,
  parsePackLinkId,
  splitOverridesForLayerPacks,
  stripGeoFromMissionOverrides,
  type StudioLayerPack,
  type StudioLayerPackItem,
} from "@/lib/cms/layer-packs";
import { slugifyStudio, type StudioGame, type StudioGameTaskLink, type StudioTask } from "@/lib/cms/types";
import { isUuid } from "@/lib/cms/city-directory";
import { parseLinkLayer, parseLinkOverrides } from "@/lib/cms/game-link-config";
import { surfaceToPreset } from "@/lib/cms/game-slots";
import { parseGpsOverride, type GpsPin } from "@/lib/cms/gps-defaults";
import { generateGameSlug } from "@/lib/grid/codes";
import type { ActionResult } from "@/lib/grid/types";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

function sanitizeIlike(raw: string): string {
  return raw.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

function revalidatePacks() {
  revalidatePath("/admin/packs");
  revalidatePath("/admin/games");
  revalidatePath("/admin/tasks");
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

async function ensureUniqueTaskSlug(
  supabase: AdminClient,
  organizationId: string,
  name: string,
): Promise<string> {
  const base = slugifyStudio(name) || "aufgabe";
  let candidate = base.slice(0, 64);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const { data } = await supabase
      .from("studio_tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${attempt + 2}`.slice(0, 64);
  }
  throw new Error("Aufgaben-Slug konnte nicht erzeugt werden.");
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

export async function fetchPackItems(
  supabase: AdminClient,
  packId: string,
): Promise<StudioLayerPackItem[]> {
  const { data, error } = await supabase
    .from("studio_layer_pack_items")
    .select("id, pack_id, task_id, sort_order, overrides, created_at, updated_at, studio_tasks(*)")
    .eq("pack_id", packId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) => {
    const item = mapPackItemRow(row as Record<string, unknown>);
    return item ? [item] : [];
  });
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
    .select("id, slug, name")
    .eq("id", cityId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
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
    const limit = Math.min(200, Math.max(1, input.limit ?? PACK_SEARCH_LIMIT));
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
      return { success: false, error: "Stadt nicht gefunden." };
    }
    const citySlug =
      city?.slug ??
      (input.layer === 1 && input.city_slug?.trim() ? slugifyStudio(input.city_slug) || input.city_slug.trim() : null);

    const { data, error } = await supabase
      .from("studio_layer_packs")
      .insert({
        organization_id: orgId,
        layer: input.layer,
        slug,
        name,
        city_id: city?.id ?? null,
        city_slug: citySlug,
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
        if (!city) return { success: false, error: "Stadt nicht gefunden." };
        payload.city_id = city.id;
        payload.city_slug = city.slug;
      }
    } else if (input.city_slug !== undefined && pack.layer === 1 && input.city_id === undefined) {
      payload.city_slug = input.city_slug?.trim() ? slugifyStudio(input.city_slug) || input.city_slug.trim() : null;
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

    const overrides: Record<string, unknown> = { ...(extras?.overrides ?? {}) };
    if (pack.layer === 3) {
      overrides.bind_slot = extras?.bind_slot ?? overrides.bind_slot ?? 0;
      overrides.role = extras?.role ?? overrides.role ?? "gamma";
      if (!overrides.when) overrides.when = { type: "immediate" };
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

function tagsForCity(source: string[] | undefined, citySlug: string | null): string[] {
  const next = [...(source ?? [])].filter(Boolean);
  if (citySlug && !next.includes(citySlug)) next.push(citySlug);
  return [...new Set(next)];
}

async function cloneTaskRow(
  supabase: AdminClient,
  orgId: string,
  source: StudioTask,
  citySlug: string | null,
): Promise<string> {
  const slug = await ensureUniqueTaskSlug(
    supabase,
    orgId,
    `${source.title}-${citySlug || "copy"}-${Math.random().toString(36).slice(2, 6)}`,
  );
  const { data, error } = await supabase
    .from("studio_tasks")
    .insert({
      organization_id: orgId,
      slug,
      title: source.title,
      description: source.description,
      language: source.language,
      city_slug: citySlug ?? source.city_slug,
      game_type: source.game_type,
      tags: tagsForCity(source.tags, citySlug),
      content: source.content,
      layer: source.layer,
      content_context: source.content_context,
      role_assignment: source.role_assignment,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function duplicateOnePack(
  supabase: AdminClient,
  orgId: string,
  source: StudioLayerPack,
  name: string,
  city?: { id: string; slug: string } | null,
): Promise<StudioLayerPack> {
  const slug = await ensureUniquePackSlug(supabase, orgId, source.layer, name);
  const cityId = source.layer === 1 ? city?.id ?? source.city_id : null;
  const citySlug = source.layer === 1 ? city?.slug ?? source.city_slug : null;
  const { data, error } = await supabase
    .from("studio_layer_packs")
    .insert({
      organization_id: orgId,
      layer: source.layer,
      slug,
      name,
      description: source.description,
      city_id: cityId,
      city_slug: citySlug,
      language: source.language,
      translations: source.translations,
      slot_count: 0,
      created_from_pack_id: source.id,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const copy = normalizeLayerPackRow(data as Record<string, unknown>);
  const items = await fetchPackItems(supabase, source.id);

  if (items.length > 0) {
    const insertItems = [];
    for (const [index, item] of items.entries()) {
      const taskId =
        source.layer === 1
          ? await cloneTaskRow(supabase, orgId, item.task, copy.city_slug)
          : item.task_id;
      insertItems.push({
        pack_id: copy.id,
        task_id: taskId,
        sort_order: item.sort_order ?? index,
        overrides: { ...item.overrides },
      });
    }
    const { error: itemError } = await supabase.from("studio_layer_pack_items").insert(insertItems);
    if (itemError) throw new Error(itemError.message);
  }

  await refreshPackSlotCount(supabase, copy.id);
  const fresh = await getOwnedPack(supabase, orgId, copy.id);
  return fresh ?? copy;
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
      for (let i = 1; i <= copies; i += 1) {
        const copy = await duplicateOnePack(supabase, orgId, source, `COPY ${i} ${source.name}`);
        createdIds.push(copy.id);
      }
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

    for (const city of cities) {
      if (template) {
        const copy = await duplicateOnePack(supabase, orgId, template, city.name, city);
        createdIds.push(copy.id);
      } else {
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

export async function composeGamesFromPacks(input: {
  name?: string;
  surface?: "outdoor" | "indoor" | "online";
  language?: StudioLanguage;
  layer1_pack_id?: string | null;
  layer2_pack_id?: string | null;
  layer3_pack_id?: string | null;
  layer1_pack_ids?: string[];
}): Promise<ActionResult<{ createdIds: string[]; createdCount: number }>> {
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

    const cityPacks: StudioLayerPack[] = [];
    for (const packId of l1Ids) {
      const pack = await getOwnedPack(supabase, orgId, packId);
      if (!pack || pack.layer !== 1) return { success: false, error: "Stadt-Pack nicht gefunden." };
      cityPacks.push(pack);
    }

    const targets = cityPacks.length > 0 ? cityPacks : [null];
    const createdIds: string[] = [];

    for (const city of targets) {
      const slug = await ensureUniqueGameSlug(supabase, orgId);
      const autoName =
        input.name?.trim() ||
        [city?.name ?? city?.city_slug, mission?.name].filter(Boolean).join(" · ") ||
        "Neues Spiel";
      const { data, error } = await supabase
        .from("studio_games")
        .insert({
          organization_id: orgId,
          blueprint_id: null,
          slug,
          name: cityPacks.length > 1 ? [city?.name ?? city?.city_slug, mission?.name ?? input.name].filter(Boolean).join(" · ") : autoName,
          description: "",
          language: parseStudioLanguage(input.language),
          translations: {},
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
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      createdIds.push(data.id as string);
    }

    revalidatePacks();
    return { success: true, data: { createdIds, createdCount: createdIds.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Spiele konnten nicht zusammengesteckt werden.",
    };
  }
}

function asStudioGame(row: Record<string, unknown>): StudioGame {
  return {
    ...(row as unknown as StudioGame),
    layer1_pack_id: (row.layer1_pack_id as string | null) ?? null,
    layer2_pack_id: (row.layer2_pack_id as string | null) ?? null,
    layer3_pack_id: (row.layer3_pack_id as string | null) ?? null,
  };
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

export async function saveGameAsLayerPacks(gameId: string): Promise<ActionResult<StudioGame>> {
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
            name: (typeof city?.name === "string" && city.name.trim()) || citySlug || game.name,
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
            name: `${game.name} · Mission`,
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
            name: `${game.name} · Team`,
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
    const items = await fetchPackItems(supabase, pack.id);
    const item = items.find((row) => row.id === parsed.itemId);
    if (!item) return { success: false, error: "Pack-Eintrag nicht gefunden." };

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
        const layer1Items = await fetchPackItems(supabase, game.layer1_pack_id);
        const sibling =
          layer1Items.find((row) => row.sort_order === item.sort_order) ?? layer1Items[item.sort_order];
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
        const layer3Items = await fetchPackItems(supabase, game.layer3_pack_id);
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
        await Promise.all(
          items
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

    revalidatePacks();
    const merged = await loadMergedGameTaskLinksForGame(supabase, {
      ...game,
      layer1_pack_id: game.layer1_pack_id,
      layer2_pack_id: game.layer2_pack_id,
      layer3_pack_id: game.layer3_pack_id,
    });
    const link = merged.find((row) => row.id === input.linkId);
    if (!link) return { success: false, error: "Slot nach dem Speichern nicht gefunden." };
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

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true, data: { count: orderedLinkIds.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reihenfolge konnte nicht gespeichert werden.",
    };
  }
}
