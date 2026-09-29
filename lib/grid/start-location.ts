import type { LevelDefinition } from "@/lib/grid/level-types";

export type StartCoords = {
  lat: number;
  lng: number;
};

/** First authored GPS pin — the meeting point players should walk to. */
export function firstPuzzleLocation(levels: LevelDefinition[] | undefined | null): StartCoords | null {
  if (!levels?.length) return null;
  const ordered = [...levels].sort((a, b) => a.level - b.level);
  for (const level of ordered) {
    const lat = level.location?.lat;
    const lng = level.location?.lng;
    if (typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  return null;
}

/** Opens walking directions in the phone maps app. Apple Maps on iPhone/iPad, Google Maps elsewhere. */
export function walkingDirectionsUrl(coords: StartCoords): string {
  const dest = `${coords.lat},${coords.lng}`;
  if (prefersAppleMaps()) {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(dest)}&dirflg=w`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=walking`;
}

function prefersAppleMaps(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
