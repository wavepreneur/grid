"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/grid/types";

const BUCKET = "studio-media";
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadStudioImage(
  formData: FormData,
): Promise<ActionResult<{ url: string; path: string }>> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Keine Datei ausgewählt." };
    }
    if (file.size > MAX_BYTES) {
      return { success: false, error: "Datei zu groß (max. 5 MB)." };
    }
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Nur Bilddateien erlaubt." };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `tiles/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
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
