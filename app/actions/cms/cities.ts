"use server";

import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  cityLabelDe,
  isUuid,
  mapCityRow,
  sanitizeCitySearch,
  sortCountriesDeFirst,
  toGridCitySlug,
  type DirectoryCity,
  type DirectoryCountry,
  type ExitmaniaCityPayload,
} from "@/lib/cms/city-directory";
import type { ActionResult } from "@/lib/grid/types";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "23505" || Boolean(error?.message?.includes("cities_org") || error?.message?.includes("duplicate key"));
}

async function upsertDirectoryCity(
  supabase: AdminClient,
  orgId: string,
  incoming: ExitmaniaCityPayload,
): Promise<DirectoryCity | null> {
  if (!isUuid(incoming.id)) return null;
  const slug = toGridCitySlug(incoming.slug, incoming.name, incoming.id);
  const name = incoming.name.trim() || slug;
  const nameEn = incoming.name_en?.trim() || null;
  const slugEn = incoming.slug_en?.trim().toLowerCase() || null;
  const country = (incoming.country_code ?? "DE").trim().toUpperCase().slice(0, 2) || "DE";
  const now = new Date().toISOString();
  const labels = { name, name_en: nameEn, slug_en: slugEn, country, updated_at: now };

  const { data: bySource } = await supabase
    .from("cities")
    .select("*")
    .eq("organization_id", orgId)
    .eq("source_city_id", incoming.id)
    .maybeSingle();

  if (bySource) {
    const withSlug = await supabase
      .from("cities")
      .update({ slug, ...labels })
      .eq("id", bySource.id)
      .select("*")
      .single();
    const updated =
      withSlug.error && isUniqueViolation(withSlug.error)
        ? await supabase.from("cities").update(labels).eq("id", bySource.id).select("*").single()
        : withSlug;
    if (updated.error) throw new Error(updated.error.message);
    const row = updated.data as Record<string, unknown>;
    await refreshCityLabels(supabase, String(row.id), String(row.slug ?? slug));
    return mapCityRow(row);
  }

  const { data: bySlug } = await supabase
    .from("cities")
    .select("*")
    .eq("organization_id", orgId)
    .eq("slug", slug)
    .maybeSingle();

  if (bySlug) {
    const existingSource = typeof bySlug.source_city_id === "string" ? bySlug.source_city_id : null;
    if (!existingSource || existingSource === incoming.id) {
      const { data, error } = await supabase
        .from("cities")
        .update({ source_city_id: incoming.id, ...labels })
        .eq("id", bySlug.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapCityRow(data as Record<string, unknown>);
    }
  }

  const insertSlug = bySlug ? `${slug}-${incoming.id.replace(/-/g, "").slice(0, 8)}`.slice(0, 64) : slug;
  const { data, error } = await supabase
    .from("cities")
    .insert({
      organization_id: orgId,
      source_city_id: incoming.id,
      slug: insertSlug,
      name,
      name_en: nameEn,
      slug_en: slugEn,
      country,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapCityRow(data as Record<string, unknown>);
}

async function refreshCityLabels(supabase: AdminClient, cityId: string, slug: string) {
  const now = new Date().toISOString();
  await supabase.from("studio_layer_packs").update({ city_slug: slug, updated_at: now }).eq("city_id", cityId);
  const { data: packs } = await supabase.from("studio_layer_packs").select("id").eq("city_id", cityId);
  const packIds = (packs ?? []).map((row) => String(row.id));
  if (packIds.length === 0) return;
  await supabase.from("studio_games").update({ city_slug: slug, updated_at: now }).in("layer1_pack_id", packIds);
}

function exitmaniaBaseUrl(): string {
  return (process.env.EXITMANIA_APP_URL ?? "").trim().replace(/\/$/, "");
}

async function exitmaniaGet(path: string, search: Record<string, string>): Promise<Response | null> {
  const base = exitmaniaBaseUrl();
  const apiKey = process.env.GRID_BOOKING_API_KEY?.trim();
  if (!base || !apiKey) return null;
  const url = new URL(path, `${base}/`);
  for (const [key, value] of Object.entries(search)) {
    if (value) url.searchParams.set(key, value);
  }
  return fetch(url.toString(), {
    headers: { "x-grid-api-key": apiKey },
    cache: "no-store",
  });
}

async function pullExitmaniaCountries(): Promise<DirectoryCountry[]> {
  const response = await exitmaniaGet("/api/internal/grid/cities", { countries: "1" });
  if (!response?.ok) return [];
  const json = (await response.json()) as { countries?: DirectoryCountry[] };
  return Array.isArray(json.countries)
    ? json.countries
        .filter((row) => typeof row.code === "string" && row.code.trim())
        .map((row) => ({
          code: row.code.trim().toUpperCase(),
          name: row.name?.trim() || row.code,
          name_en: row.name_en ?? null,
        }))
    : [];
}

async function pullExitmaniaCities(input: {
  query?: string;
  country?: string;
  catalog?: boolean;
  offset?: number;
  limit?: number;
}): Promise<{ cities: ExitmaniaCityPayload[]; nextOffset: number | null }> {
  const response = await exitmaniaGet("/api/internal/grid/cities", {
    q: input.query ?? "",
    country: input.country ?? "",
    all: input.catalog ? "1" : "",
    offset: String(input.offset ?? 0),
    limit: String(input.limit ?? (input.catalog ? 500 : 80)),
  });
  if (!response?.ok) return { cities: [], nextOffset: null };
  const json = (await response.json()) as {
    cities?: ExitmaniaCityPayload[];
    next_offset?: number | null;
  };
  return {
    cities: Array.isArray(json.cities) ? json.cities : [],
    nextOffset: typeof json.next_offset === "number" ? json.next_offset : null,
  };
}

export async function listDirectoryCountries(): Promise<ActionResult<DirectoryCountry[]>> {
  try {
    const remote = await pullExitmaniaCountries();
    if (remote.length > 0) return { success: true, data: sortCountriesDeFirst(remote) };

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cities")
      .select("country")
      .eq("organization_id", orgId)
      .not("source_city_id", "is", null);
    if (error) throw new Error(error.message);
    const codes = [...new Set((data ?? []).map((row) => String(row.country ?? "DE").toUpperCase()))].sort();
    return {
      success: true,
      data: codes.map((code) => ({ code, name: code, name_en: null })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Länder konnten nicht geladen werden.",
    };
  }
}

export async function searchDirectoryCities(
  search = "",
  country = "",
): Promise<ActionResult<DirectoryCity[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const q = sanitizeCitySearch(search);
    const countryCode = country.trim().toUpperCase();

    let query = supabase
      .from("cities")
      .select("id, source_city_id, slug, slug_en, name, name_en, country")
      .eq("organization_id", orgId)
      .not("source_city_id", "is", null)
      .order("name")
      .limit(80);
    if (q) {
      query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,name_en.ilike.%${q}%`);
    } else if (countryCode) {
      query = query.eq("country", countryCode);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    let rows = ((data ?? []) as Record<string, unknown>[])
      .map(mapCityRow)
      .filter((city) => Boolean(city.source_city_id));

    if (rows.length === 0 && q.length >= 2) {
      const remote = await pullExitmaniaCities({ query: q, limit: 80 });
      for (const city of remote.cities) {
        try {
          const upserted = await upsertDirectoryCity(supabase, orgId, city);
          if (upserted) rows.push(upserted);
        } catch {
          // Cache miss is fine — local GRID cities still searchable.
        }
      }
    }

    if (countryCode && q) {
      rows.sort((a, b) => Number(b.country === countryCode) - Number(a.country === countryCode));
    }
    return { success: true, data: rows };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Städte konnten nicht geladen werden.",
    };
  }
}

const CITY_INSERT_CHUNK = 100;
const CITY_PAGE = 1000;

async function listOrgCities(supabase: AdminClient, orgId: string): Promise<DirectoryCity[]> {
  const rows: DirectoryCity[] = [];
  for (let from = 0; ; from += CITY_PAGE) {
    const { data, error } = await supabase
      .from("cities")
      .select("id, source_city_id, slug, slug_en, name, name_en, country")
      .eq("organization_id", orgId)
      .order("slug")
      .range(from, from + CITY_PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Record<string, unknown>[];
    for (const row of page) rows.push(mapCityRow(row));
    if (page.length < CITY_PAGE) break;
  }
  return rows;
}

export async function syncExitmaniaCityDirectory(): Promise<ActionResult<DirectoryCity[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const incoming: ExitmaniaCityPayload[] = [];
    let offset = 0;
    for (let page = 0; page < 20; page += 1) {
      const { cities, nextOffset } = await pullExitmaniaCities({
        catalog: true,
        offset,
        limit: 500,
      });
      if (cities.length === 0) break;
      incoming.push(...cities);
      if (nextOffset == null) break;
      offset = nextOffset;
    }
    if (incoming.length === 0) {
      return {
        success: false,
        error: "Keine Exitmania-Städte geladen. Läuft Exitmania und ist EXITMANIA_APP_URL gesetzt?",
      };
    }

    const existing = await listOrgCities(supabase, orgId);
    const bySource = new Map<string, DirectoryCity>();
    const usedSlugs = new Set<string>();
    for (const mapped of existing) {
      if (mapped.slug) usedSlugs.add(mapped.slug);
      if (mapped.source_city_id) bySource.set(mapped.source_city_id, mapped);
    }

    const toInsert: Array<{
      organization_id: string;
      source_city_id: string;
      slug: string;
      name: string;
      name_en: string | null;
      slug_en: string | null;
      country: string;
    }> = [];
    const synced: DirectoryCity[] = [];

    for (const city of incoming) {
      if (!isUuid(city.id)) continue;
      const already = bySource.get(city.id);
      if (already) {
        synced.push(already);
        continue;
      }
      let slug = toGridCitySlug(city.slug, city.name, city.id);
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${city.id.replace(/-/g, "").slice(0, 8)}`.slice(0, 64);
      }
      usedSlugs.add(slug);
      const name = city.name.trim() || slug;
      toInsert.push({
        organization_id: orgId,
        source_city_id: city.id,
        slug,
        name,
        name_en: city.name_en?.trim() || null,
        slug_en: city.slug_en?.trim().toLowerCase() || null,
        country: (city.country_code ?? "DE").trim().toUpperCase().slice(0, 2) || "DE",
      });
    }

    for (let index = 0; index < toInsert.length; index += CITY_INSERT_CHUNK) {
      const chunk = toInsert.slice(index, index + CITY_INSERT_CHUNK);
      const { data, error } = await supabase
        .from("cities")
        .insert(chunk)
        .select("id, source_city_id, slug, slug_en, name, name_en, country");
      if (error && isUniqueViolation(error)) {
        for (const row of chunk) {
          const incomingCity = incoming.find((city) => city.id === row.source_city_id);
          if (!incomingCity) continue;
          const upserted = await upsertDirectoryCity(supabase, orgId, incomingCity);
          if (upserted) synced.push(upserted);
        }
        continue;
      }
      if (error) throw new Error(error.message);
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        synced.push(mapCityRow(row));
      }
    }

    if (synced.length === 0) {
      return {
        success: false,
        error: "Keine Exitmania-Städte geladen. Läuft Exitmania und ist EXITMANIA_APP_URL gesetzt?",
      };
    }
    return { success: true, data: synced };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Städte konnten nicht synchronisiert werden.",
    };
  }
}

export async function findDirectoryCityBySlugOrName(
  slug = "",
  name = "",
): Promise<ActionResult<DirectoryCity | null>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const slugKey = slug.trim().toLowerCase();
    const nameKey = name.trim();
    if (slugKey) {
      const { data, error } = await supabase
        .from("cities")
        .select("id, source_city_id, slug, slug_en, name, name_en, country")
        .eq("organization_id", orgId)
        .eq("slug", slugKey)
        .not("source_city_id", "is", null)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) return { success: true, data: mapCityRow(data as Record<string, unknown>) };
    }
    if (nameKey) {
      const { data, error } = await supabase
        .from("cities")
        .select("id, source_city_id, slug, slug_en, name, name_en, country")
        .eq("organization_id", orgId)
        .ilike("name", nameKey)
        .not("source_city_id", "is", null)
        .limit(5);
      if (error) throw new Error(error.message);
      const rows = ((data ?? []) as Record<string, unknown>[]).map(mapCityRow);
      const exact =
        rows.find((city) => city.country === "DE") ?? (rows.length === 1 ? rows[0] : null);
      return { success: true, data: exact ?? null };
    }
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Stadt konnte nicht geladen werden.",
    };
  }
}

export async function getDirectoryCity(cityId: string): Promise<ActionResult<DirectoryCity>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cities")
      .select("id, source_city_id, slug, slug_en, name, name_en, country")
      .eq("organization_id", orgId)
      .eq("id", cityId)
      .maybeSingle();
    if (error) {
      const retry = await supabase
        .from("cities")
        .select("id, slug, name, country")
        .eq("organization_id", orgId)
        .eq("id", cityId)
        .maybeSingle();
      if (retry.error) throw new Error(retry.error.message);
      if (!retry.data) return { success: false, error: "Stadt nicht gefunden." };
      return { success: true, data: mapCityRow(retry.data as Record<string, unknown>) };
    }
    if (!data) return { success: false, error: "Stadt nicht gefunden." };
    return { success: true, data: mapCityRow(data as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Stadt konnte nicht geladen werden.",
    };
  }
}

export { cityLabelDe };
