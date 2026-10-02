import { slugifyStudio } from "@/lib/cms/types";

export type StudioCollection = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CollectionCityCount = {
  citySlug: string;
  gameCount: number;
};

export type StudioCollectionStat = StudioCollection & {
  gameCount: number;
  cityCount: number;
  cityCounts: CollectionCityCount[];
};

export type StudioCollectionOverview = {
  collections: StudioCollectionStat[];
  unassignedGameCount: number;
  unassignedCityCount: number;
  unassignedCityCounts: CollectionCityCount[];
};

export function normalizeCollectionRow(row: Record<string, unknown>): StudioCollection {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function collectionSlugFromName(name: string): string {
  return slugifyStudio(name) || "collection";
}
