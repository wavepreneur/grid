"use server";

import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  cityLabelDe,
  isUuid,
  mapCityRow,
  sanitizeCitySearch,
  toGridCitySlug,
  type DirectoryCity,
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

async function pullExitmaniaCities(query: string): Promise<ExitmaniaCityPayload[]> {
  const base = (process.env.EXITMANIA_APP_URL ?? "").trim().replace(/\/$/, "");
  const apiKey = process.env.GRID_BOOKING_API_KEY?.trim();
  if (!base || !apiKey) return [];

  const url = new URL("/api/internal/grid/cities", `${base}/`);
  if (query) url.searchParams.set("q", query);
  url.searchParams.set("limit", "40");

  const response = await fetch(url.toString(), {
    headers: { "x-grid-api-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const json = (await response.json()) as { cities?: ExitmaniaCityPayload[] };
  return Array.isArray(json.cities) ? json.cities : [];
}

export async function searchDirectoryCities(search = ""): Promise<ActionResult<DirectoryCity[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const q = sanitizeCitySearch(search);

    const remote = q.length >= 2 ? await pullExitmaniaCities(q) : [];
    for (const city of remote) {
      try {
        await upsertDirectoryCity(supabase, orgId, city);
      } catch {
        // Cache miss is fine — local GRID cities still searchable.
      }
    }

    const filter = q ? `name.ilike.%${q}%,slug.ilike.%${q}%` : null;
    const full = supabase
      .from("cities")
      .select("id, source_city_id, slug, slug_en, name, name_en, country")
      .eq("organization_id", orgId)
      .order("name")
      .limit(40);
    const query = filter ? full.or(filter) : full;
    let { data, error } = await query;

    if (error) {
      const core = supabase
        .from("cities")
        .select("id, slug, name, country")
        .eq("organization_id", orgId)
        .order("name")
        .limit(40);
      const fallback = filter ? core.or(filter) : core;
      const retry = await fallback;
      if (retry.error) throw new Error(retry.error.message);
      data = retry.data;
      error = null;
    }
    return {
      success: true,
      data: (data ?? []).map((row) => mapCityRow(row as Record<string, unknown>)),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Städte konnten nicht geladen werden.",
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
