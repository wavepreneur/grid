import {
  getLevelDefinition,
  normalizeAnswer,
  requiresGps,
  resolveEventContent,
} from "@/lib/grid/content-engine";
import { isWithinGeofence } from "@/lib/grid/geofence";
import type {
  LevelDefinition,
  ResolvedEventContent,
  SolveLevelPayload,
} from "@/lib/grid/level-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TEMPLATE_SLUG } from "@/lib/grid/level-types";

export function validateLevelSolution(
  level: LevelDefinition,
  payload: SolveLevelPayload,
): { ok: true } | { ok: false; error: string } {
  if (level.type === "gps") {
    if (!level.location) {
      return { ok: false, error: "GPS-Level ohne Koordinaten konfiguriert." };
    }
    if (!payload.geolocation) {
      return { ok: false, error: "GPS-Position erforderlich. Bitte Standort freigeben." };
    }
    if (!isWithinGeofence(payload.geolocation, level.location)) {
      return {
        ok: false,
        error: `Ihr seid noch nicht am Checkpoint (Radius: ${level.location.radius_meters} m).`,
      };
    }
    return { ok: true };
  }

  if (level.type === "digital") {
    if (!payload.answer?.trim()) {
      return { ok: false, error: "Bitte eine Antwort eingeben." };
    }
    if (!level.answer) {
      return { ok: false, error: "Level ohne Lösung konfiguriert." };
    }
    if (normalizeAnswer(payload.answer) !== normalizeAnswer(level.answer)) {
      return { ok: false, error: "Falsche Antwort. Versucht es erneut." };
    }
    return { ok: true };
  }

  if (level.type === "quiz") {
    if (!payload.selectedOptionId) {
      return { ok: false, error: "Bitte eine Antwort auswählen." };
    }
    if (payload.selectedOptionId !== level.correct_option_id) {
      return { ok: false, error: "Falsche Antwort. Versucht es erneut." };
    }
    return { ok: true };
  }

  return { ok: false, error: "Unbekannter Level-Typ." };
}

export async function loadResolvedEventContent(
  eventId: string,
  contentConfig: unknown,
  routeOverride: unknown,
): Promise<ResolvedEventContent> {
  const config = (contentConfig ?? {}) as Record<string, unknown>;
  const templateSlug = (config.template_slug as string | undefined) ?? DEFAULT_TEMPLATE_SLUG;

  const supabase = createAdminClient();
  const { data: template, error } = await supabase
    .from("route_templates")
    .select("slug, name, city, levels")
    .eq("slug", templateSlug)
    .single();

  if (error || !template) {
    throw new Error(`Route-Template „${templateSlug}" nicht gefunden.`);
  }

  return resolveEventContent({
    template,
    contentConfig,
    routeOverride,
  });
}

export { getLevelDefinition, requiresGps };
