"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { StudioOrganization } from "@/lib/cms/types";
import type { ActionResult } from "@/lib/grid/types";
import { ADMIN_CAPABILITIES } from "@/lib/cms/org-roles";
import { PORTAL_COOKIE, verifyPortalSession } from "@/lib/marketing/portal-session";

const ORG_COOKIE = "grid_studio_org";
const ORG_ID_COOKIE = "grid_studio_org_id";

function orgCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 365,
  };
}

async function getPortalOrgSlug(): Promise<string | null> {
  const jar = await cookies();
  const session = await verifyPortalSession(jar.get(PORTAL_COOKIE)?.value);
  return session?.orgSlug ?? null;
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Organizations the current user may switch into (membership-aware). */
export async function listOrganizations(): Promise<ActionResult<StudioOrganization[]>> {
  try {
    const supabase = createAdminClient();
    const portalOrgSlug = await getPortalOrgSlug();

    if (portalOrgSlug) {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, slug, name")
        .eq("slug", portalOrgSlug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { success: true, data: data ? ([data] as StudioOrganization[]) : [] };
    }

    const userId = await getSessionUserId();

    if (userId) {
      const { data: memberships, error: memError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId);

      if (memError) {
        // Table not migrated yet — fall through to full org list
        if (!/organization_members|schema cache|does not exist/i.test(memError.message)) {
          throw new Error(memError.message);
        }
      } else {
        const orgIds = (memberships ?? []).map((m) => m.organization_id as string);
        if (orgIds.length > 0) {
          const { data, error } = await supabase
            .from("organizations")
            .select("id, slug, name")
            .in("id", orgIds)
            .order("name");
          if (error) throw new Error(error.message);
          return { success: true, data: (data ?? []) as StudioOrganization[] };
        }
      }
    }

    // Fallback while memberships roll out / unauthenticated local studio
    const { data, error } = await supabase
      .from("organizations")
      .select("id, slug, name")
      .order("name");

    if (error) throw new Error(error.message);
    return { success: true, data: (data ?? []) as StudioOrganization[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Organisationen konnten nicht geladen werden.",
    };
  }
}

export async function getStudioOrganizationId(): Promise<string> {
  const cookieStore = await cookies();
  const cachedId = cookieStore.get(ORG_ID_COOKIE)?.value;
  const portalOrgSlug = await getPortalOrgSlug();
  const slugCookie = portalOrgSlug ?? cookieStore.get(ORG_COOKIE)?.value;

  const supabase = createAdminClient();

  if (slugCookie) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slugCookie)
      .maybeSingle();

    if (!error && data?.id) {
      if (cachedId !== data.id) {
        cookieStore.set(ORG_ID_COOKIE, data.id, orgCookieOptions());
      }
      return data.id;
    }
  }

  if (cachedId && !portalOrgSlug) return cachedId;

  if (portalOrgSlug) {
    throw new Error("Kein Projekt für diesen Zugang gefunden.");
  }

  const { data: fallback } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "exitmania")
    .maybeSingle();
  if (!fallback?.id) throw new Error("Keine Organisation gefunden.");
  cookieStore.set(ORG_ID_COOKIE, fallback.id, orgCookieOptions());
  return fallback.id;
}

export async function setStudioOrganization(slug: string): Promise<ActionResult<{ slug: string }>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { success: false, error: "Organisation nicht gefunden." };

    const portalOrgSlug = await getPortalOrgSlug();
    if (portalOrgSlug && portalOrgSlug !== data.slug) {
      return { success: false, error: "Kein Zugriff auf dieses Projekt." };
    }

    const userId = await getSessionUserId();
    if (userId) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", data.id)
        .maybeSingle();

      // Only enforce when the user already has at least one membership
      const { count } = await supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if ((count ?? 0) > 0 && !membership) {
        return { success: false, error: "Kein Zugriff auf dieses Projekt." };
      }
    }

    const cookieStore = await cookies();
    cookieStore.set(ORG_COOKIE, data.slug, orgCookieOptions());
    cookieStore.set(ORG_ID_COOKIE, data.id, orgCookieOptions());

    return { success: true, data: { slug: data.slug } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Organisation konnte nicht gesetzt werden.",
    };
  }
}

export async function getStudioOrganizationSlug(): Promise<string> {
  const cookieStore = await cookies();
  const portalOrgSlug = await getPortalOrgSlug();
  return portalOrgSlug ?? cookieStore.get(ORG_COOKIE)?.value ?? "exitmania";
}

export async function bindStudioOrganization(
  slug: string,
): Promise<ActionResult<{ slug: string; name: string }>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { success: false, error: "Organisation nicht gefunden." };

    const cookieStore = await cookies();
    cookieStore.set(ORG_COOKIE, data.slug, orgCookieOptions());
    cookieStore.set(ORG_ID_COOKIE, data.id, orgCookieOptions());
    return { success: true, data: { slug: data.slug, name: data.name } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Organisation konnte nicht gesetzt werden.",
    };
  }
}

export async function clearStudioOrganizationCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, "", { ...orgCookieOptions(), maxAge: 0 });
  cookieStore.set(ORG_ID_COOKIE, "", { ...orgCookieOptions(), maxAge: 0 });
}

/**
 * Assign Exitmania + Tabbrain as admin to an email (service-role).
 * Used for bootstrap / ops — creates memberships for existing auth users.
 */
export async function assignStudioAdminByEmail(
  email: string,
): Promise<ActionResult<{ userId: string; orgCount: number }>> {
  try {
    const supabase = createAdminClient();
    const normalized = email.trim().toLowerCase();

    const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 200,
    });
    if (listError) throw new Error(listError.message);

    let user = listed.users.find((u) => u.email?.toLowerCase() === normalized);

    if (!user) {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: normalized,
        email_confirm: true,
        user_metadata: { full_name: "Dervis", studio_admin: true },
      });
      if (createError) throw new Error(createError.message);
      user = created.user;
    }

    if (!user?.id) {
      return { success: false, error: `Kein Auth-User für ${normalized}.` };
    }

    const { data: orgs, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .in("slug", ["exitmania", "tabbrain"]);
    if (orgError) throw new Error(orgError.message);

    for (const org of orgs ?? []) {
      const { error: upsertError } = await supabase.from("organization_members").upsert(
        {
          organization_id: org.id,
          user_id: user.id,
          role: "admin",
          ...ADMIN_CAPABILITIES,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,user_id" },
      );
      if (upsertError) throw new Error(upsertError.message);
    }

    return {
      success: true,
      data: { userId: user.id, orgCount: orgs?.length ?? 0 },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Memberships konnten nicht zugewiesen werden.",
    };
  }
}
