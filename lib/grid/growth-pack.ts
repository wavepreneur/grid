/**
 * Booking-time growth handoff. Commerce (Exitmania/Tabbrain) owns mail and CTAs.
 * GRID only renders the public card and POSTs to URLs from the pack.
 *
 * Secrets (capture_url, webhook_url, capture_secret) stay on events.content_config
 * and must never be copied onto ResolvedEventContent.
 */

export const GROWTH_SURFACES = [
  "exitmania_b2c",
  "exitmania_teamevent",
  "tabbrain",
  "studio",
  "partner",
] as const;

export type GrowthSurface = (typeof GROWTH_SURFACES)[number];

export type GrowthPack = {
  enabled: boolean;
  surface: GrowthSurface;
  headline: string;
  body: string;
  cta_label: string;
  skip_label: string;
  share_label: string | null;
  share_url: string | null;
  capture_url: string | null;
  webhook_url: string | null;
  capture_secret: string | null;
};

/** Player-visible subset — no capture/webhook secrets. */
export type GrowthOffer = {
  enabled: boolean;
  surface: GrowthSurface;
  headline: string;
  body: string;
  ctaLabel: string;
  skipLabel: string;
  shareLabel: string | null;
  shareUrl: string | null;
  discountCode: string | null;
  discountNote: string | null;
  studioPreview: boolean;
};

export const STUDIO_DUMMY_DISCOUNT_CODE = "GRID-TEST-20";

export function studioGrowthOffer(): GrowthOffer {
  return {
    enabled: true,
    surface: "studio",
    headline: "Mit Familie & Freunden spielen",
    body: "20 % auf euer nächstes Exitmania-Spiel. Der Code gilt einmal — für Freunde oder die Familie.",
    ctaLabel: "Auswertung per Mail",
    skipLabel: "Jetzt nicht",
    shareLabel: null,
    shareUrl: null,
    discountCode: STUDIO_DUMMY_DISCOUNT_CODE,
    discountNote: "Studio-Test: Dummy-Code, einmal gedacht. Im Live-Checkout kommt der echte Code.",
    studioPreview: true,
  };
}

export const EMPTY_GROWTH_PACK: GrowthPack = {
  enabled: false,
  surface: "exitmania_b2c",
  headline: "",
  body: "",
  cta_label: "",
  skip_label: "",
  share_label: null,
  share_url: null,
  capture_url: null,
  webhook_url: null,
  capture_secret: null,
};

function isGrowthSurface(value: unknown): value is GrowthSurface {
  return GROWTH_SURFACES.includes(value as GrowthSurface);
}

function readTrimmed(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  if (!next) return null;
  return next.slice(0, max);
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function readHttpUrl(value: unknown): string | null {
  const raw = readTrimmed(value, 2000);
  if (!raw || !isSafeHttpUrl(raw)) return null;
  return raw;
}

export function parseGrowthPack(contentConfig: unknown): GrowthPack {
  if (!contentConfig || typeof contentConfig !== "object") {
    return { ...EMPTY_GROWTH_PACK };
  }
  const raw = (contentConfig as { growth?: unknown }).growth;
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_GROWTH_PACK };
  }
  const flags = raw as Record<string, unknown>;
  const surface = isGrowthSurface(flags.surface) ? flags.surface : "exitmania_b2c";
  const headline = readTrimmed(flags.headline, 160) ?? "";
  const cta = readTrimmed(flags.cta_label, 80) ?? "";
  const enabled = flags.enabled === true && Boolean(headline && cta);

  return {
    enabled,
    surface,
    headline,
    body: readTrimmed(flags.body, 400) ?? "",
    cta_label: cta,
    skip_label: readTrimmed(flags.skip_label, 80) ?? "Jetzt nicht",
    share_label: readTrimmed(flags.share_label, 80),
    share_url: readHttpUrl(flags.share_url),
    capture_url: readHttpUrl(flags.capture_url),
    webhook_url: readHttpUrl(flags.webhook_url),
    capture_secret: readTrimmed(flags.capture_secret, 200),
  };
}

export function resolvePlayGrowthOffer(
  contentConfig: unknown,
  isStudioTest: boolean,
): GrowthOffer | null {
  return parseGrowthOffer(contentConfig) ?? (isStudioTest ? studioGrowthOffer() : null);
}

export function parseGrowthOffer(contentConfig: unknown): GrowthOffer | null {
  const pack = parseGrowthPack(contentConfig);
  if (!pack.enabled) return null;
  const discountCode = readTrimmed(
    (contentConfig as { growth?: { discount_code?: unknown } }).growth?.discount_code,
    40,
  );
  return {
    enabled: true,
    surface: pack.surface,
    headline: pack.headline,
    body: pack.body,
    ctaLabel: pack.cta_label,
    skipLabel: pack.skip_label || "Jetzt nicht",
    shareLabel: pack.share_label,
    shareUrl: pack.share_url,
    discountCode,
    discountNote: readTrimmed(
      (contentConfig as { growth?: { discount_note?: unknown } }).growth?.discount_note,
      200,
    ),
    studioPreview: pack.surface === "studio",
  };
}

export function sanitizeGrowthPackInput(raw: unknown): GrowthPack | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = parseGrowthPack({ growth: raw });
  if (!parsed.enabled) return null;
  return parsed;
}
