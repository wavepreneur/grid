import type { ResolvedEventContent } from "@/lib/grid/level-types";

const CACHE_PREFIX = "grid_event_content_";
const memory = new Map<string, ResolvedEventContent>();

function cacheKey(inviteCode: string): string {
  return inviteCode.trim().toUpperCase();
}

function persist(storage: Storage, key: string, json: string): boolean {
  try {
    storage.setItem(`${CACHE_PREFIX}${key}`, json);
    return true;
  } catch {
    return false;
  }
}

function read(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(`${CACHE_PREFIX}${key}`);
  } catch {
    return null;
  }
}

export function cacheEventContent(
  inviteCode: string,
  content: ResolvedEventContent,
): void {
  const key = cacheKey(inviteCode);
  memory.set(key, content);
  if (typeof window === "undefined") return;
  const json = JSON.stringify(content);
  persist(sessionStorage, key, json);
  persist(localStorage, key, json);
}

export function loadCachedEventContent(
  inviteCode: string,
): ResolvedEventContent | null {
  const key = cacheKey(inviteCode);
  const fromMemory = memory.get(key);
  if (fromMemory) return fromMemory;
  if (typeof window === "undefined") return null;

  const raw = read(sessionStorage, key) ?? read(localStorage, key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ResolvedEventContent;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}
