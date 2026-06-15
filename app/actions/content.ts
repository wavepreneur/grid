"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveEventContent } from "@/lib/grid/content-engine";
import { getEventByInviteCode } from "@/lib/grid/session-auth";
import { DEFAULT_TEMPLATE_SLUG } from "@/lib/grid/level-types";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
import type { ActionResult } from "@/lib/grid/types";
import { normalizeCode } from "@/lib/grid/codes";

async function loadTemplate(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("route_templates")
    .select("slug, name, city, levels")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getEventContent(
  inviteCode: string,
): Promise<ActionResult<ResolvedEventContent & { eventId: string }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const contentConfig = event.content_config as Record<string, unknown> | null;
    const templateSlug =
      (contentConfig?.template_slug as string | undefined) ?? DEFAULT_TEMPLATE_SLUG;

    const template = await loadTemplate(templateSlug);
    if (!template) {
      return { success: false, error: `Route-Template „${templateSlug}" nicht gefunden.` };
    }

    const resolved = resolveEventContent({
      template,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
    });

    return {
      success: true,
      data: {
        ...resolved,
        eventId: event.id,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function updateEventRouteOverride(input: {
  inviteCode: string;
  routeOverrideJson: string;
}): Promise<ActionResult<{ inviteCode: string }>> {
  try {
    const inviteCode = normalizeCode(input.inviteCode);
    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input.routeOverrideJson);
    } catch {
      return { success: false, error: "Ungültiges JSON für route_override." };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("events")
      .update({ route_override: parsed })
      .eq("id", event.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { inviteCode: event.invite_code } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}
