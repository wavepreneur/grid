import type { ResolvedEventContent } from "@/lib/grid/level-types";

const CACHE_PREFIX = "grid_event_content_";

export function cacheEventContent(eventId: string, content: ResolvedEventContent): void {
  localStorage.setItem(`${CACHE_PREFIX}${eventId}`, JSON.stringify(content));
}

export function loadCachedEventContent(eventId: string): ResolvedEventContent | null {
  const raw = localStorage.getItem(`${CACHE_PREFIX}${eventId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ResolvedEventContent;
  } catch {
    return null;
  }
}
