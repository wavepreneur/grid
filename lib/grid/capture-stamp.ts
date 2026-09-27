export type CaptureBrandStamp = {
  gameTitle: string;
  siteUrl?: string;
};

const DEFAULT_SITE = "exitmania.com";

export function resolveCaptureBrandStamp(input: {
  gameTitle?: string | null;
  siteUrl?: string | null;
}): CaptureBrandStamp {
  const gameTitle = (input.gameTitle ?? "").trim() || "Exitmania";
  const siteUrl = (input.siteUrl ?? "").trim() || DEFAULT_SITE;
  return { gameTitle, siteUrl };
}

function fitOneLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let cut = text.length;
  while (cut > 1 && ctx.measureText(`${text.slice(0, cut)}${ellipsis}`).width > maxWidth) {
    cut -= 1;
  }
  return `${text.slice(0, cut)}${ellipsis}`;
}

/**
 * Bakes a compact Exitmania footer onto a captured JPEG:
 * logo wordmark, game name, website. No score.
 */
export async function stampCapturePhoto(
  blob: Blob,
  stamp: CaptureBrandStamp,
): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return blob;

  const bitmap = await createImageBitmap(blob);
  const w = bitmap.width;
  const h = bitmap.height;
  if (w < 32 || h < 32) {
    bitmap.close();
    return blob;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return blob;
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pad = Math.round(w * 0.048);
  const logoSize = Math.round(w * 0.036);
  const titleSize = Math.round(w * 0.03);
  const urlSize = Math.round(w * 0.024);
  const gap = Math.round(w * 0.01);
  const mark = Math.round(logoSize * 0.72);
  const markGap = Math.round(w * 0.014);

  const urlY = h - pad;
  const titleY = urlY - urlSize - gap;
  const logoY = titleY - titleSize - gap;
  const footerTop = logoY - logoSize - pad * 0.55;
  const fadeH = Math.round(w * 0.1);
  const fadeTop = Math.max(0, footerTop - fadeH);

  const fade = ctx.createLinearGradient(0, fadeTop, 0, footerTop);
  fade.addColorStop(0, "rgba(8,6,4,0)");
  fade.addColorStop(1, "rgba(8,6,4,0.78)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, fadeTop, w, footerTop - fadeTop);
  ctx.fillStyle = "rgba(8,6,4,0.82)";
  ctx.fillRect(0, footerTop, w, h - footerTop);

  ctx.fillStyle = "#FF6A00";
  ctx.fillRect(0, footerTop, Math.max(4, Math.round(w * 0.01)), h - footerTop);

  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "#FF6A00";
  ctx.fillRect(pad, logoY - mark, mark, mark);

  const textLeft = pad + mark + markGap;
  const maxTextW = w - textLeft - pad;

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${logoSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText("EXITMANIA", textLeft, logoY);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = `600 ${titleSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(fitOneLine(ctx, stamp.gameTitle, maxTextW), textLeft, titleY);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `500 ${urlSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(fitOneLine(ctx, stamp.siteUrl ?? DEFAULT_SITE, maxTextW), textLeft, urlY);

  const stamped = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), "image/jpeg", 0.88);
  });
  return stamped ?? blob;
}
