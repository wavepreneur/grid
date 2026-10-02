"use server";

import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  collectionSlugFromName,
  normalizeCollectionRow,
  type CollectionCityCount,
  type StudioCollection,
  type StudioCollectionOverview,
} from "@/lib/cms/collections";
import type { ActionResult } from "@/lib/grid/types";
import { createAdminClient } from "@/lib/supabase/admin";

const GAME_PAGE = 1000;

type GameCollectionRow = {
  collection_id: string | null;
  city_slug: string | null;
};

async function loadGameCollectionRows(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
): Promise<GameCollectionRow[]> {
  const rows: GameCollectionRow[] = [];
  for (let from = 0; ; from += GAME_PAGE) {
    const { data, error } = await supabase
      .from("studio_games")
      .select("collection_id, city_slug")
      .eq("organization_id", orgId)
      .neq("is_template", true)
      .order("id", { ascending: true })
      .range(from, from + GAME_PAGE - 1);
    if (error) throw new Error(error.message);
    const chunk = (data ?? []) as GameCollectionRow[];
    rows.push(...chunk);
    if (chunk.length < GAME_PAGE) break;
  }
  return rows;
}

function cityCountsFromMap(cities: Map<string, number>): CollectionCityCount[] {
  return [...cities.entries()]
    .map(([citySlug, gameCount]) => ({ citySlug, gameCount }))
    .sort((a, b) => b.gameCount - a.gameCount || a.citySlug.localeCompare(b.citySlug, "de"));
}

function statsFromRows(
  collections: StudioCollection[],
  rows: GameCollectionRow[],
): StudioCollectionOverview {
  const byId = new Map<string, Map<string, number>>();
  const unassigned = new Map<string, number>();

  for (const row of rows) {
    const city = row.city_slug?.trim() || "ohne-stadt";
    if (!row.collection_id) {
      unassigned.set(city, (unassigned.get(city) ?? 0) + 1);
      continue;
    }
    const cities = byId.get(row.collection_id) ?? new Map<string, number>();
    cities.set(city, (cities.get(city) ?? 0) + 1);
    byId.set(row.collection_id, cities);
  }

  const unassignedCityCounts = cityCountsFromMap(unassigned);
  return {
    collections: collections.map((collection) => {
      const cityCounts = cityCountsFromMap(byId.get(collection.id) ?? new Map());
      return {
        ...collection,
        gameCount: cityCounts.reduce((sum, city) => sum + city.gameCount, 0),
        cityCount: cityCounts.filter((city) => city.citySlug !== "ohne-stadt").length,
        cityCounts,
      };
    }),
    unassignedGameCount: unassignedCityCounts.reduce((sum, city) => sum + city.gameCount, 0),
    unassignedCityCount: unassignedCityCounts.filter((city) => city.citySlug !== "ohne-stadt").length,
    unassignedCityCounts,
  };
}

async function ensureUniqueSlug(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  name: string,
): Promise<string> {
  const base = collectionSlugFromName(name);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("studio_collections")
      .select("id")
      .eq("organization_id", orgId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return slug;
  }
  throw new Error("Collection-Slug konnte nicht erzeugt werden.");
}

export async function listStudioCollections(): Promise<ActionResult<StudioCollectionOverview>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("studio_collections")
      .select("id, organization_id, slug, name, created_at, updated_at")
      .eq("organization_id", orgId)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    const collections = (data ?? []).map((row) => normalizeCollectionRow(row as Record<string, unknown>));
    const rows = await loadGameCollectionRows(supabase, orgId);
    return { success: true, data: statsFromRows(collections, rows) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Collections konnten nicht geladen werden.",
    };
  }
}

export async function createStudioCollection(input: {
  name: string;
}): Promise<ActionResult<StudioCollection>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const name = input.name.trim();
    if (name.length < 2) return { success: false, error: "Bitte einen Collection-Namen eingeben." };
    const slug = await ensureUniqueSlug(supabase, orgId, name);
    const { data, error } = await supabase
      .from("studio_collections")
      .insert({ organization_id: orgId, slug, name })
      .select("id, organization_id, slug, name, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { success: true, data: normalizeCollectionRow(data as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Collection konnte nicht erstellt werden.",
    };
  }
}

export async function getOwnedCollection(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  collectionId: string,
): Promise<StudioCollection | null> {
  const { data, error } = await supabase
    .from("studio_collections")
    .select("id, organization_id, slug, name, created_at, updated_at")
    .eq("id", collectionId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeCollectionRow(data as Record<string, unknown>) : null;
}
