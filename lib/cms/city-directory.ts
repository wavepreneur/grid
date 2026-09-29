/**
 * City directory — labels from Exitmania, identity = Exitmania cities.id.
 * Slug/name may change. GRID packs store cities.id, not slug.
 */

export type DirectoryCity = {
  id: string;
  source_city_id: string | null;
  slug: string;
  slug_en: string | null;
  name: string;
  name_en: string | null;
  country: string;
};

export type ExitmaniaCityPayload = {
  id: string;
  slug: string;
  slug_en?: string | null;
  name: string;
  name_en?: string | null;
  country_code?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function sanitizeCitySearch(raw: string): string {
  return raw.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

/** GRID cities.slug must match `^[a-z0-9-]{2,64}$`. Labels, not identity. */
export function toGridCitySlug(raw: string, fallbackName = "", sourceCityId?: string): string {
  const candidates = [raw, fallbackName].map((value) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64),
  );
  const match = candidates.find((value) => /^[a-z0-9-]{2,64}$/.test(value));
  if (match) return match;
  const suffix = (sourceCityId ?? "city").replace(/-/g, "").slice(0, 12);
  return `city-${suffix}`.slice(0, 64);
}

export function mapCityRow(row: Record<string, unknown>): DirectoryCity {
  return {
    id: String(row.id),
    source_city_id: typeof row.source_city_id === "string" ? row.source_city_id : null,
    slug: String(row.slug ?? ""),
    slug_en: typeof row.slug_en === "string" && row.slug_en.trim() ? row.slug_en.trim() : null,
    name: String(row.name ?? ""),
    name_en: typeof row.name_en === "string" && row.name_en.trim() ? row.name_en.trim() : null,
    country: String(row.country ?? "DE"),
  };
}

export function cityLabelDe(city: Pick<DirectoryCity, "name" | "slug">): string {
  return city.name.trim() || city.slug;
}
