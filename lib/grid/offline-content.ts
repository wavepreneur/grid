import type { ResolvedEventContent } from "@/lib/grid/level-types";

const CACHE_PREFIX = "grid_event_content_";
const memory = new Map<string, ResolvedEventContent>();

function cacheKey(inviteCode: string): string {
  return inviteCode.trim().toUpperCase();
}

export function cacheEventContent(
  inviteCode: string,
  content: ResolvedEventContent,
): void {
  const key = cacheKey(inviteCode);
  memory.set(key, content);
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(content));
  } catch {
    /* quota / private mode */
  }
}

export function loadCachedEventContent(
  inviteCode: string,
): ResolvedEventContent | null {
  const key = cacheKey(inviteCode);
  const fromMemory = memory.get(key);
  if (fromMemory) return fromMemory;
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ResolvedEventContent;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}
