"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import { getEventByInviteCode } from "@/lib/grid/session-auth";
import { DEFAULT_CITY_SLUG } from "@/lib/grid/level-types";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
import type { ActionResult } from "@/lib/grid/types";
import { normalizeCode } from "@/lib/grid/codes";

export async function getEventContent(
  inviteCode: string,
): Promise<ActionResult<ResolvedEventContent & { eventId: string }>> {
  try {
    const event = await getEventByInviteCode(normalizeCode(inviteCode));
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const resolved = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
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

export async function updateEventCity(input: {
  inviteCode: string;
  citySlug?: string;
}): Promise<ActionResult<{ citySlug: string }>> {
  try {
    const inviteCode = normalizeCode(input.inviteCode);
    const citySlug = (input.citySlug ?? DEFAULT_CITY_SLUG).trim().toLowerCase();
    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const supabase = createAdminClient();
    const { data: city, error: cityError } = await supabase
      .from("cities")
      .select("id")
      .eq("organization_id", event.organization_id)
      .eq("slug", citySlug)
      .maybeSingle();

    if (cityError || !city) {
      return { success: false, error: `Stadt „${citySlug}" nicht gefunden.` };
    }

    const contentConfig = {
      ...(typeof event.content_config === "object" && event.content_config
        ? event.content_config
        : {}),
      city_slug: citySlug,
    };

    const { error } = await supabase
      .from("events")
      .update({ city_id: city.id, content_config: contentConfig })
      .eq("id", event.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { citySlug } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}
