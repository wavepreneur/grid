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

/** Opens walking directions in the phone maps app / Google Maps. */
export function walkingDirectionsUrl(coords: StartCoords): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=walking`;
}
