"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/grid/types";

const BUCKET = "studio-media";
const MAX_BYTES = 4.5 * 1024 * 1024;
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function asUploadBlob(value: FormDataEntryValue | null): Blob | null {
  if (!value || typeof value !== "object") return null;
  if (!("arrayBuffer" in value) || !("size" in value)) return null;
  const blob = value as Blob;
  return blob.size > 0 ? blob : null;
}

function extensionFor(blob: Blob, filename: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ALLOWED_EXT.has(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  if (blob.type === "image/png") return "png";
  if (blob.type === "image/webp") return "webp";
  if (blob.type === "image/gif") return "gif";
  return "jpg";
}

export async function uploadStudioImage(
  formData: FormData,
): Promise<ActionResult<{ url: string; path: string }>> {
  try {
    const file = asUploadBlob(formData.get("file"));
    if (!file) {
      return { success: false, error: "Keine Datei ausgewählt." };
    }
    if (file.size > MAX_BYTES) {
      return { success: false, error: "Datei zu groß (max. 4 MB)." };
    }
    if (file.type && !file.type.startsWith("image/")) {
      return { success: false, error: "Nur Bilddateien erlaubt." };
    }

    const filename = file instanceof File ? file.name : "image";
    const ext = extensionFor(file, filename);
    const path = `tiles/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
      upsert: false,
    });

    if (error) throw new Error(error.message);

    const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { success: true, data: { url: publicUrl.publicUrl, path } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload fehlgeschlagen.",
    };
  }
}
