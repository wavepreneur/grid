/**
 * Player help docs (briefing / FAQ) — iframe URLs from studio game feature_flags.
 */

export type GameHelpLinks = {
  briefingIframeUrl: string | null;
  faqIframeUrl: string | null;
};

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

export function parseGameHelpLinks(featureFlags: unknown): GameHelpLinks {
  if (!featureFlags || typeof featureFlags !== "object") {
    return { briefingIframeUrl: null, faqIframeUrl: null };
  }
  const flags = featureFlags as Record<string, unknown>;
  return {
    briefingIframeUrl: asHttpUrl(flags.briefing_iframe_url),
    faqIframeUrl: asHttpUrl(flags.faq_iframe_url),
  };
}

export function withGameHelpLinks(
  featureFlags: Record<string, unknown> | null | undefined,
  links: { briefingIframeUrl?: string | null; faqIframeUrl?: string | null },
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(featureFlags ?? {}) };
  if (links.briefingIframeUrl !== undefined) {
    const url = asHttpUrl(links.briefingIframeUrl);
    if (url) next.briefing_iframe_url = url;
    else delete next.briefing_iframe_url;
  }
  if (links.faqIframeUrl !== undefined) {
    const url = asHttpUrl(links.faqIframeUrl);
    if (url) next.faq_iframe_url = url;
    else delete next.faq_iframe_url;
  }
  return next;
}
