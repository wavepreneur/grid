/**
 * Indoor station helpers — Layer 1 without GPS.
 * @see docs/GRID_LAYER_MODEL.md § Indoor-Stationen
 */

import type { LevelStation, StationKind } from "@/lib/grid/level-types";

const DEFAULT_KINDS: StationKind[] = [
  "search",
  "logic",
  "puzzle",
  "logic",
  "team",
  "finale",
];

/** Default codes A1, A2, … then B1 — unique per pack, overridable per booking. */
export function defaultStationCode(index1Based: number): string {
  const i = Math.max(1, index1Based) - 1;
  const letter = String.fromCharCode(65 + Math.floor(i / 9));
  const num = (i % 9) + 1;
  return `${letter}${num}`;
}

export function buildDefaultStation(input: {
  index1Based: number;
  name: string;
  place?: string;
  kind?: StationKind;
  minutes?: number;
  points?: number;
}): LevelStation {
  return {
    name: input.name,
    place: input.place ?? "",
    code: defaultStationCode(input.index1Based),
    kind: input.kind ?? DEFAULT_KINDS[(input.index1Based - 1) % DEFAULT_KINDS.length],
    minutes: input.minutes,
    points: input.points,
  };
}

export function normalizeStationCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
