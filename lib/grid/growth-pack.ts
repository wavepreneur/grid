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
  discount_code: string | null;
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

/**
 * Shared live voucher. Change `code` + `issuedOn` together (~every 30 days).
 * Each code stays redeemable for `validDays` from `issuedOn` and works for everyone.
 */
export const LIVE_FAMILY_VOUCHER = {
  code: "EXIT3710",
  percent: 20,
  issuedOn: "2026-09-27",
  validDays: 60,
} as const;

export const EXITMANIA_SHARE_URL = "https://exitmania.com";
export const EXITMANIA_TEAM_RANKING_URL = "https://exitmania.com/team-ranking";

function addUtcDays(isoDate: string, days: number): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days));
}

export function liveFamilyVoucherUntil(): Date {
  return addUtcDays(LIVE_FAMILY_VOUCHER.issuedOn, LIVE_FAMILY_VOUCHER.validDays);
}

export function formatDeDay(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getUTCFullYear()}`;
}

export function familyVoucherBadge(): string {
  return `${LIVE_FAMILY_VOUCHER.percent} % · ${LIVE_FAMILY_VOUCHER.validDays} Tage · Team bis 4`;
}

function isHrProbeUrl(url: string | null): boolean {
  return Boolean(url?.includes("/grid-hr-probe"));
}

export function familyVoucherOffer(input: {
  surface: GrowthSurface;
  discountCode?: string | null;
  shareUrl?: string | null;
}): GrowthOffer {
  const code = (input.discountCode?.trim() || LIVE_FAMILY_VOUCHER.code).toUpperCase();
  const shareUrl =
    input.shareUrl && isSafeHttpUrl(input.shareUrl) && !isHrProbeUrl(input.shareUrl)
      ? input.shareUrl
      : EXITMANIA_SHARE_URL;
  return {
    enabled: true,
    surface: input.surface,
    headline: "Mit Familie & Freunden spielen",
    body: "20 % auf euer nächstes Exitmania-Spiel. Selbst einlösen — oder mit einem Tipp an Freunde senden.",
    ctaLabel: "Per Messenger senden",
    skipLabel: "Jetzt nicht",
    shareLabel: "Per Messenger senden",
    shareUrl,
    discountCode: code,
    discountNote: `Einlösbar bis ${formatDeDay(liveFamilyVoucherUntil())}. Gilt für alle.`,
    studioPreview: input.surface === "studio",
  };
}

export function studioGrowthOffer(): GrowthOffer {
  return familyVoucherOffer({ surface: "studio" });
}

export function buildVoucherShareMessage(input: {
  score?: number | null;
  discountCode?: string | null;
  shareUrl?: string | null;
}): { title: string; text: string; url: string } {
  const url =
    input.shareUrl && isSafeHttpUrl(input.shareUrl) ? input.shareUrl : EXITMANIA_SHARE_URL;
  const challenge =
    typeof input.score === "number"
      ? `${input.score} Punkte. Schlag mich, wenn du kannst 🔥`
      : "Schlag mich, wenn du kannst 🔥";
  const codeLine = input.discountCode
    ? `🎟️ ${LIVE_FAMILY_VOUCHER.percent} %-Code: ${input.discountCode} — ${LIVE_FAMILY_VOUCHER.validDays} Tage, Team bis 4 Personen`
    : null;
  return {
    title: "Schlag mich, wenn du kannst",
    text: [challenge, codeLine, url].filter(Boolean).join("\n\n"),
    url,
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
  discount_code: null,
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
    discount_code: readTrimmed(flags.discount_code, 40),
  };
}

export function resolvePlayGrowthOffer(
  contentConfig: unknown,
  isStudioTest: boolean,
): GrowthOffer | null {
  const pack = parseGrowthPack(contentConfig);
  const liveSurface = pack.surface === "exitmania_b2c" || pack.surface === "exitmania_teamevent";
  if (isStudioTest || (pack.enabled && liveSurface)) {
    return familyVoucherOffer({
      surface: isStudioTest ? "studio" : pack.surface,
      discountCode: pack.discount_code,
      shareUrl: pack.share_url,
    });
  }
  return parseGrowthOffer(contentConfig);
}

export function parseGrowthOffer(contentConfig: unknown): GrowthOffer | null {
  const pack = parseGrowthPack(contentConfig);
  if (!pack.enabled) return null;
  return {
    enabled: true,
    surface: pack.surface,
    headline: pack.headline,
    body: pack.body,
    ctaLabel: pack.cta_label,
    skipLabel: pack.skip_label || "Jetzt nicht",
    shareLabel: pack.share_label ?? "Per Messenger senden",
    shareUrl: pack.share_url ?? EXITMANIA_SHARE_URL,
    discountCode: pack.discount_code,
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
