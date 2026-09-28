/**
 * Player help docs (briefing / FAQ) and outdoor intro video — URLs from studio game feature_flags.
 */

import type { ContentMode } from "@/lib/cms/layer-model";

export type GameHelpLinks = {
  briefingIframeUrl: string | null;
  faqIframeUrl: string | null;
  introYoutubeUrl: string | null;
};

/** Exitmania outdoor intro — used when a game has no CMS URL for that language. */
export const DEFAULT_OUTDOOR_INTRO_YOUTUBE = {
  de: "https://youtu.be/E6FDPoOf6B0",
  en: "https://youtu.be/7Xxfv7PCxMU",
} as const;

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

export function parseGameHelpLinks(featureFlags: unknown): GameHelpLinks {
  if (!featureFlags || typeof featureFlags !== "object") {
    return { briefingIframeUrl: null, faqIframeUrl: null, introYoutubeUrl: null };
  }
  const flags = featureFlags as Record<string, unknown>;
  return {
    briefingIframeUrl: asHttpUrl(flags.briefing_iframe_url),
    faqIframeUrl: asHttpUrl(flags.faq_iframe_url),
    introYoutubeUrl: asHttpUrl(flags.intro_youtube_url),
  };
}

export function withGameHelpLinks(
  featureFlags: Record<string, unknown> | null | undefined,
  links: {
    briefingIframeUrl?: string | null;
    faqIframeUrl?: string | null;
    introYoutubeUrl?: string | null;
  },
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
  if (links.introYoutubeUrl !== undefined) {
    const url = asHttpUrl(links.introYoutubeUrl);
    if (url) next.intro_youtube_url = url;
    else delete next.intro_youtube_url;
  }
  return next;
}

export function youtubeVideoId(url: string | null | undefined): string | null {
  const raw = asHttpUrl(url);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id?.trim() || null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
      const fromQuery = parsed.searchParams.get("v")?.trim();
      if (fromQuery) return fromQuery;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const marker = parts.findIndex(
        (part) => part === "embed" || part === "shorts" || part === "live",
      );
      if (marker >= 0 && parts[marker + 1]) return parts[marker + 1];
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    fs: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function resolveIntroYoutubeUrl(input: {
  stored: string | null | undefined;
  language?: string | null;
  contentMode?: ContentMode | null;
}): string | null {
  const stored = asHttpUrl(input.stored);
  if (stored && youtubeVideoId(stored)) return stored;
  if (input.contentMode !== "outdoor") return stored;
  const lang = input.language === "de" ? "de" : "en";
  return DEFAULT_OUTDOOR_INTRO_YOUTUBE[lang];
}
