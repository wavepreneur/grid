"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { assertPlayerSession } from "@/lib/grid/session-auth";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import { getLevelDefinition } from "@/lib/grid/content-engine";
import { bonusMediaKind, findBonusInContent } from "@/lib/grid/bonus";
import { isMediaInputMode } from "@/lib/grid/level-types";
import type { ActionResult } from "@/lib/grid/types";
import {
  EVENT_CAPTURES_BUCKET,
  EVENT_CAPTURE_MAX_BYTES,
  listEventCapturesByEventId,
  normalizeCaptureMime,
  parseCaptureKind,
  type EventCaptureItem,
  type EventCaptureKind,
} from "@/lib/grid/event-captures";

function absoluteStorageUrl(signedUrl: string): string {
  if (signedUrl.startsWith("http://") || signedUrl.startsWith("https://")) {
    return signedUrl;
  }
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const path = signedUrl.startsWith("/") ? signedUrl : `/${signedUrl}`;
  if (path.startsWith("/storage/v1")) return `${base}${path}`;
  return `${base}/storage/v1${path}`;
}

function randomCaptureName(ext: string): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${id}.${ext}`;
}

function extensionForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";
  return mime.startsWith("video/") ? "mp4" : "jpg";
}

async function assertCaptureAllowed(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  levelNumber: number;
  kind: EventCaptureKind;
  bonusId?: string;
}) {
  const { event, team, player } = await assertPlayerSession(input);
  if (team.status !== "playing") {
    throw new Error("Das Spiel läuft gerade nicht.");
  }

  const content = await loadResolvedEventContent({
    eventId: event.id,
    organizationId: event.organization_id,
    cityId: event.city_id,
    contentConfig: event.content_config,
    routeOverride: event.route_override,
    studioGameVersionId: event.studio_game_version_id,
  });
  if (input.bonusId) {
    const bonus = findBonusInContent(content.levels, input.bonusId, input.levelNumber);
    const media = bonus ? bonusMediaKind(bonus) : null;
    if (media && media !== input.kind) {
      throw new Error(
        media === "video"
          ? "Diese Aufgabe erwartet ein Video."
          : "Diese Aufgabe erwartet ein Foto.",
      );
    }
  } else {
    const level = getLevelDefinition(content, input.levelNumber);
    if (!level || !isMediaInputMode(level.input_mode) || level.input_mode !== input.kind) {
      throw new Error("Diese Aufgabe nimmt keine Aufnahme entgegen.");
    }
  }

  return { event, team, player };
}

export async function prepareEventCaptureUpload(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  levelNumber: number;
  kind: string;
  bonusId?: string;
  mimeType: string;
  byteSize: number;
}): Promise<ActionResult<{ path: string; token: string; signedUrl: string }>> {
  try {
    const kind = parseCaptureKind(input.kind);
    if (!kind) {
      return { success: false, error: "Unbekannter Aufnahme-Typ." };
    }
    if (!Number.isFinite(input.levelNumber)) {
      return { success: false, error: "Session ungültig." };
    }
    if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
      return { success: false, error: "Keine Datei ausgewählt." };
    }
    if (input.byteSize > EVENT_CAPTURE_MAX_BYTES) {
      return { success: false, error: "Datei zu groß (max. 25 MB)." };
    }
    const mimeType = normalizeCaptureMime(input.mimeType, kind);
    if (!mimeType) {
      return { success: false, error: "Dieses Dateiformat wird nicht unterstützt." };
    }
    if (kind === "video" && !mimeType.startsWith("video/")) {
      return { success: false, error: "Bitte ein Video senden." };
    }
    if (kind !== "video" && !mimeType.startsWith("image/")) {
      return { success: false, error: "Bitte ein Foto senden." };
    }

    const { event } = await assertCaptureAllowed({
      inviteCode: input.inviteCode,
      joinCode: input.joinCode,
      sessionId: input.sessionId,
      levelNumber: input.levelNumber,
      kind,
      bonusId: input.bonusId?.trim() || undefined,
    });

    const path = `${event.id}/${randomCaptureName(extensionForMime(mimeType))}`;
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(EVENT_CAPTURES_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data?.token || !data.signedUrl) {
      throw new Error(error?.message || "Upload-Link fehlgeschlagen.");
    }

    return {
      success: true,
      data: {
        path: data.path ?? path,
        token: data.token,
        signedUrl: absoluteStorageUrl(data.signedUrl),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload fehlgeschlagen.",
    };
  }
}

export async function finalizeEventCapture(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  levelNumber: number;
  kind: string;
  bonusId?: string;
  path: string;
  mimeType: string;
}): Promise<ActionResult<{ id: string; publicUrl: string }>> {
  try {
    const kind = parseCaptureKind(input.kind);
    if (!kind) {
      return { success: false, error: "Unbekannter Aufnahme-Typ." };
    }
    const mimeType = normalizeCaptureMime(input.mimeType, kind);
    if (!mimeType) {
      return { success: false, error: "Dieses Dateiformat wird nicht unterstützt." };
    }

    const { event, team, player } = await assertCaptureAllowed({
      inviteCode: input.inviteCode,
      joinCode: input.joinCode,
      sessionId: input.sessionId,
      levelNumber: input.levelNumber,
      kind,
      bonusId: input.bonusId?.trim() || undefined,
    });

    const path = input.path.trim();
    if (!path.startsWith(`${event.id}/`) || path.includes("..")) {
      return { success: false, error: "Upload ungültig." };
    }

    const supabase = createAdminClient();
    const { data: publicUrl } = supabase.storage
      .from(EVENT_CAPTURES_BUCKET)
      .getPublicUrl(path);

    const { data, error } = await supabase
      .from("event_captures")
      .insert({
        event_id: event.id,
        team_id: team.id,
        player_id: player.id,
        level_number: input.levelNumber,
        kind,
        storage_path: path,
        public_url: publicUrl.publicUrl,
        mime_type: mimeType,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return {
      success: true,
      data: { id: data.id as string, publicUrl: publicUrl.publicUrl },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload fehlgeschlagen.",
    };
  }
}

export async function listTeamEventCaptures(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<{ items: EventCaptureItem[] }>> {
  try {
    const { event, team } = await assertPlayerSession(input);
    if (team.status !== "playing" && team.status !== "finished") {
      return { success: false, error: "Galerie ist jetzt nicht verfügbar." };
    }
    const items = await listEventCapturesByEventId(event.id, team.id);
    return { success: true, data: { items } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Galerie nicht geladen.",
    };
  }
}
