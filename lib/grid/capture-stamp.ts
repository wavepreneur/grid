import { encodeCanvasJpeg, fitCaptureSize } from "@/lib/grid/compress-capture";

export type CaptureBrandStamp = {
  score: number;
  gameTitle: string;
  siteUrl?: string;
};

export function resolveCaptureBrandStamp(input: {
  score: number;
  gameTitle?: string | null;
}): CaptureBrandStamp {
  const gameTitle = input.gameTitle?.replace(/^\[Test\]\s*/, "").trim();
  return {
    score: input.score,
    gameTitle: gameTitle || "GRID",
    siteUrl: "exitmania.com",
  };
}

function fitLabel(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

/** Instagram-ready footer: score, game name, site — baked into the JPEG. */
export async function stampCapturePhoto(
  blob: Blob,
  stamp: CaptureBrandStamp,
): Promise<Blob> {
  if (!blob.type.startsWith("image/") && blob.type !== "") return blob;
  const bitmap = await createImageBitmap(blob);
  const size = fitCaptureSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  const w = canvas.width;
  const h = canvas.height;
  const pad = Math.max(18, Math.round(w * 0.045));
  const barH = Math.max(120, Math.round(h * 0.26));
  const textMax = w - pad * 2;

  const fade = ctx.createLinearGradient(0, h - barH, 0, h);
  fade.addColorStop(0, "rgba(8, 16, 14, 0)");
  fade.addColorStop(0.28, "rgba(8, 16, 14, 0.42)");
  fade.addColorStop(1, "rgba(8, 16, 14, 0.92)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, h - barH, w, barH);

  ctx.fillStyle = "#f97316";
  ctx.fillRect(pad, h - barH + Math.round(pad * 0.55), Math.round(w * 0.11), 4);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `600 ${Math.round(w * 0.028)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText("EXITMANIA", pad, h - barH + pad * 1.45);

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(w * 0.086)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(fitLabel(ctx, `${stamp.score} P`, textMax), pad, h - pad * 2.15);

  ctx.font = `700 ${Math.round(w * 0.038)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(fitLabel(ctx, stamp.gameTitle, textMax), pad, h - pad * 1.2);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = `600 ${Math.round(w * 0.03)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(stamp.siteUrl ?? "exitmania.com", pad, h - pad * 0.48);

  return (await encodeCanvasJpeg(canvas)) ?? blob;
}
