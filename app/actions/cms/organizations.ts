"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StudioOrganization } from "@/lib/cms/types";
import type { ActionResult } from "@/lib/grid/types";

const ORG_COOKIE = "grid_studio_org";
const ORG_ID_COOKIE = "grid_studio_org_id";

export async function listOrganizations(): Promise<ActionResult<StudioOrganization[]>> {
  try {
    const supabase = createAdminClient();
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
  if (cachedId) return cachedId;

  const slug = cookieStore.get(ORG_COOKIE)?.value ?? "exitmania";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data?.id) {
    const { data: fallback } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "exitmania")
      .maybeSingle();
    if (!fallback?.id) throw new Error("Keine Organisation gefunden.");
    cookieStore.set(ORG_ID_COOKIE, fallback.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return fallback.id;
  }

  cookieStore.set(ORG_ID_COOKIE, data.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return data.id;
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

    const cookieStore = await cookies();
    cookieStore.set(ORG_COOKIE, slug, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    cookieStore.set(ORG_ID_COOKIE, data.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return { success: true, data: { slug } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Organisation konnte nicht gesetzt werden.",
    };
  }
}

export async function getStudioOrganizationSlug(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(ORG_COOKIE)?.value ?? "exitmania";
}
