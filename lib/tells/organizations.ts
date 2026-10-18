import { createAdminClient } from "@/lib/supabase/admin";

export type OrganizationTheme = {
  accent?: string;
  accentMuted?: string;
  background?: string;
  surface?: string;
  border?: string;
  text?: string;
  textMuted?: string;
};

export type Organization = {
  id: string;
  slug: string;
  name: string;
  theme_config: OrganizationTheme;
};

const DEFAULT_ORG_SLUG = "exitmania";

export async function getOrganizationBySlug(
  slug: string = DEFAULT_ORG_SLUG,
): Promise<Organization | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, slug, name, theme_config")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Organization | null;
}

export async function getDefaultOrganizationId(): Promise<string> {
  const org = await getOrganizationBySlug(DEFAULT_ORG_SLUG);
  if (!org) {
    throw new Error('Standard-Organisation "exitmania" nicht gefunden.');
  }
  return org.id;
}

export async function getCityIdBySlug(
  organizationId: string,
  citySlug: string,
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", citySlug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
