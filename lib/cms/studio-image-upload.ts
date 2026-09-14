/** Client-side prep so Studio uploads stay under the Vercel/Next body limit. */

export const STUDIO_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const MAX_EDGE = 1600;

export function studioImageTooBigMessage(maxBytes = STUDIO_IMAGE_MAX_BYTES): string {
  const mb = Math.round(maxBytes / (1024 * 1024));
  return `Datei zu groß (max. ${mb} MB). PNG verkleinern oder weniger Pixel nutzen.`;
}

export async function prepareStudioImageUpload(
  file: File,
  opts?: { requireTransparency?: boolean },
): Promise<File> {
  if (opts?.requireTransparency && file.type !== "image/png") {
    throw new Error("Für den Kamerarahmen bitte ein PNG mit transparenter Mitte nehmen — JPEG füllt die Mitte schwarz.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Nur Bilddateien erlaubt.");
  }
  if (file.size === 0) {
    throw new Error("Keine Datei ausgewählt.");
  }
  if (file.size <= STUDIO_IMAGE_MAX_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Bild konnte nicht verarbeitet werden.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mime = file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error("Bild-Export fehlgeschlagen."))),
      mime,
      0.9,
    );
  });

  if (blob.size > STUDIO_IMAGE_MAX_BYTES) {
    throw new Error(studioImageTooBigMessage());
  }

  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type: mime });
}
