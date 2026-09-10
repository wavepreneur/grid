import { createAdminClient } from "@/lib/supabase/admin";
import { loadPortalEventByToken } from "@/lib/grid/portal";
import { isMediaInputMode, type MediaInputMode } from "@/lib/grid/level-types";

export const EVENT_CAPTURES_BUCKET = "event-captures";
export const EVENT_CAPTURE_MAX_BYTES = 25 * 1024 * 1024;
export const EVENT_CAPTURE_VIDEO_MAX_SECONDS = 30;

export type EventCaptureKind = MediaInputMode;

export type EventCaptureItem = {
  id: string;
  kind: EventCaptureKind;
  publicUrl: string;
  mimeType: string;
  levelNumber: number;
  teamName: string;
  createdAt: string;
};

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export function isAllowedCaptureMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export function parseCaptureKind(raw: unknown): EventCaptureKind | null {
  if (typeof raw !== "string") return null;
  return isMediaInputMode(raw) ? raw : null;
}

export async function listEventCapturesByPortalToken(
  token: string,
): Promise<{ title: string; items: EventCaptureItem[] } | null> {
  const event = await loadPortalEventByToken(token);
  if (!event) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("event_captures")
    .select("id, kind, public_url, mime_type, level_number, created_at, team_id")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const teamIds = [...new Set((data ?? []).map((row) => row.team_id as string))];
  const names = new Map<string, string>();
  if (teamIds.length > 0) {
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);
    if (teamsError) throw new Error(teamsError.message);
    for (const team of teams ?? []) {
      names.set(team.id as string, (team.name as string) || "Team");
    }
  }

  return {
    title: event.title,
    items: (data ?? []).map((row) => ({
      id: row.id as string,
      kind: (row.kind as EventCaptureKind) ?? "photo",
      publicUrl: row.public_url as string,
      mimeType: row.mime_type as string,
      levelNumber: row.level_number as number,
      teamName: names.get(row.team_id as string) ?? "Team",
      createdAt: row.created_at as string,
    })),
  };
}
