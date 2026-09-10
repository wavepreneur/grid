"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { assertPlayerSession } from "@/lib/grid/session-auth";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import { getLevelDefinition } from "@/lib/grid/content-engine";
import { isMediaInputMode } from "@/lib/grid/level-types";
import type { ActionResult } from "@/lib/grid/types";
import {
  EVENT_CAPTURES_BUCKET,
  EVENT_CAPTURE_MAX_BYTES,
  isAllowedCaptureMime,
  parseCaptureKind,
} from "@/lib/grid/event-captures";

function randomCaptureName(ext: string): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${id}.${ext}`;
}

function extensionForMime(mime: string, fallbackName: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";
  const fromName = fallbackName.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return mime.startsWith("video/") ? "mp4" : "jpg";
}

export async function uploadEventCapture(
  formData: FormData,
): Promise<ActionResult<{ id: string; publicUrl: string }>> {
  try {
    const kind = parseCaptureKind(formData.get("kind"));
    if (!kind) {
      return { success: false, error: "Unbekannter Aufnahme-Typ." };
    }

    const inviteCode = String(formData.get("inviteCode") ?? "");
    const joinCode = String(formData.get("joinCode") ?? "");
    const sessionId = String(formData.get("sessionId") ?? "");
    const levelNumber = Number(formData.get("levelNumber"));
    if (!inviteCode || !joinCode || !sessionId || !Number.isFinite(levelNumber)) {
      return { success: false, error: "Session ungültig." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Keine Datei ausgewählt." };
    }
    if (file.size > EVENT_CAPTURE_MAX_BYTES) {
      return { success: false, error: "Datei zu groß (max. 25 MB)." };
    }
    if (!isAllowedCaptureMime(file.type)) {
      return { success: false, error: "Dieses Dateiformat wird nicht unterstützt." };
    }
    if (kind === "video" && !file.type.startsWith("video/")) {
      return { success: false, error: "Bitte ein Video senden." };
    }
    if (kind !== "video" && !file.type.startsWith("image/")) {
      return { success: false, error: "Bitte ein Foto senden." };
    }

    const { event, team, player } = await assertPlayerSession({
      inviteCode,
      joinCode,
      sessionId,
    });
    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft gerade nicht." };
    }

    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
      studioGameVersionId: event.studio_game_version_id,
    });
    const level = getLevelDefinition(content, levelNumber);
    if (!level || !isMediaInputMode(level.input_mode) || level.input_mode !== kind) {
      return { success: false, error: "Diese Aufgabe nimmt keine Aufnahme entgegen." };
    }

    const ext = extensionForMime(file.type, file.name);
    const path = `${event.id}/${randomCaptureName(ext)}`;
    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(EVENT_CAPTURES_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrl } = supabase.storage
      .from(EVENT_CAPTURES_BUCKET)
      .getPublicUrl(path);

    const { data, error } = await supabase
      .from("event_captures")
      .insert({
        event_id: event.id,
        team_id: team.id,
        player_id: player.id,
        level_number: levelNumber,
        kind,
        storage_path: path,
        public_url: publicUrl.publicUrl,
        mime_type: file.type,
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
