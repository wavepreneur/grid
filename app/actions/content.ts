"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import { getEventByInviteCode } from "@/lib/grid/session-auth";
import { DEFAULT_CITY_SLUG } from "@/lib/grid/level-types";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
import type { ActionResult, GridEvent } from "@/lib/grid/types";
import { bumpEventContentRevision, getEventContentRevisionByInviteCode } from "@/lib/grid/content-revision";
import { normalizeCode } from "@/lib/grid/codes";

export type EventAdminDetails = {
  inviteCode: string;
  title: string;
  status: GridEvent["status"];
  routeOverrideJson: string;
};

function formatRouteOverride(value: unknown): string {
  if (!value || (typeof value === "object" && Object.keys(value as object).length === 0)) {
    return "{}";
  }
  return JSON.stringify(value, null, 2);
}

export async function getEventAdminDetails(
  inviteCode: string,
): Promise<ActionResult<EventAdminDetails>> {
  try {
    const normalized = normalizeCode(inviteCode);
    const event = await getEventByInviteCode(normalized);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    return {
      success: true,
      data: {
        inviteCode: event.invite_code,
        title: event.title,
        status: event.status,
        routeOverrideJson: formatRouteOverride(event.route_override),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function getEventContent(
  inviteCode: string,
): Promise<ActionResult<ResolvedEventContent & { eventId: string; contentRevision: number }>> {
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

    const contentRevision =
      typeof (event as { content_revision?: number }).content_revision === "number"
        ? (event as { content_revision: number }).content_revision
        : 1;

    return {
      success: true,
      data: {
        ...resolved,
        eventId: event.id,
        contentRevision,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function getEventContentRevision(
  inviteCode: string,
): Promise<ActionResult<{ contentRevision: number }>> {
  try {
    const revision = await getEventContentRevisionByInviteCode(normalizeCode(inviteCode));
    if (revision === null) {
      return { success: false, error: "Event nicht gefunden." };
    }
    return { success: true, data: { contentRevision: revision } };
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
}): Promise<ActionResult<{ inviteCode: string; routeOverrideJson: string }>> {
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

    await bumpEventContentRevision(event.id);

    return {
      success: true,
      data: {
        inviteCode: event.invite_code,
        routeOverrideJson: formatRouteOverride(parsed),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function applyGpsTestOverride(input: {
  inviteCode: string;
  radiusMeters?: number;
  lat?: number;
  lng?: number;
}): Promise<ActionResult<{ inviteCode: string; routeOverrideJson: string; gpsLevels: number[] }>> {
  try {
    const inviteCode = normalizeCode(input.inviteCode);
    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }

    const radiusMeters = input.radiusMeters ?? 50_000;
    const lat = input.lat ?? 52.516275;
    const lng = input.lng ?? 13.377704;

    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
    });

    const gpsLevels = content.levels.filter((level) => level.type === "gps");
    if (gpsLevels.length === 0) {
      return { success: false, error: "Keine GPS-Level in dieser Route gefunden." };
    }

    const existingOverride =
      event.route_override && typeof event.route_override === "object"
        ? (event.route_override as Record<string, unknown>)
        : {};
    const existingLevels =
      existingOverride.levels && typeof existingOverride.levels === "object"
        ? { ...(existingOverride.levels as Record<string, unknown>) }
        : {};

    for (const level of gpsLevels) {
      existingLevels[String(level.level)] = {
        ...(typeof existingLevels[String(level.level)] === "object"
          ? (existingLevels[String(level.level)] as Record<string, unknown>)
          : {}),
        type: "gps",
        location: { lat, lng, radius_meters: radiusMeters },
      };
    }

    const mergedOverride = {
      ...existingOverride,
      levels: existingLevels,
    };

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("events")
      .update({ route_override: mergedOverride })
      .eq("id", event.id);

    if (error) {
      return { success: false, error: error.message };
    }

    await bumpEventContentRevision(event.id);

    return {
      success: true,
      data: {
        inviteCode: event.invite_code,
        routeOverrideJson: formatRouteOverride(mergedOverride),
        gpsLevels: gpsLevels.map((level) => level.level),
      },
    };
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

    await bumpEventContentRevision(event.id);

    return { success: true, data: { citySlug } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}
