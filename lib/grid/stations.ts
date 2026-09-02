/**
 * Indoor station helpers — Layer 1 without GPS.
 * Access codes hang in the room; the phone never shows them.
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

/** No 0/O/1/I — readable on printed signs. */
const ACCESS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const STATION_ACCESS_CODE_MIN = 4;
export const STATION_ACCESS_CODE_MAX = 10;

/** Default codes A1, A2, … then B1 — legacy pack fallback. */
export function defaultStationCode(index1Based: number): string {
  const i = Math.max(1, index1Based) - 1;
  const letter = String.fromCharCode(65 + Math.floor(i / 9));
  const num = (i % 9) + 1;
  return `${letter}${num}`;
}

export function randomStationAccessCode(
  length = STATION_ACCESS_CODE_MIN,
): string {
  const n = clampCodeLength(length);
  let out = "";
  const bytes = new Uint8Array(n);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < n; i++) {
    out += ACCESS_ALPHABET[bytes[i]! % ACCESS_ALPHABET.length];
  }
  return out;
}

/** Stable 4-char code when Studio has not persisted one yet. */
export function stationAccessCodeFromSeed(
  seed: string,
  length = STATION_ACCESS_CODE_MIN,
): string {
  const n = clampCodeLength(length);
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let out = "";
  for (let i = 0; i < n; i++) {
    out += ACCESS_ALPHABET[Math.abs(h) % ACCESS_ALPHABET.length];
    h = Math.imul(h ^ (h >>> 13), 16777619);
  }
  return out;
}

export function parseStationAccessCode(raw: string): string | null {
  const code = normalizeStationCode(raw);
  if (code.length < STATION_ACCESS_CODE_MIN || code.length > STATION_ACCESS_CODE_MAX) {
    return null;
  }
  if (!/^[A-Z0-9]+$/.test(code)) return null;
  return code;
}

export function resolveStationAccessCode(
  authored: string | null | undefined,
  seed: string,
): string {
  const parsed = authored ? parseStationAccessCode(authored) : null;
  return parsed ?? stationAccessCodeFromSeed(seed);
}

export function buildDefaultStation(input: {
  index1Based: number;
  name: string;
  place?: string;
  kind?: StationKind;
  minutes?: number;
  points?: number;
  code?: string;
  seed?: string;
}): LevelStation {
  const seed = input.seed ?? `${input.name}:${input.index1Based}`;
  return {
    name: input.name,
    place: input.place ?? "",
    code: resolveStationAccessCode(input.code, seed),
    kind: input.kind ?? DEFAULT_KINDS[(input.index1Based - 1) % DEFAULT_KINDS.length],
    minutes: input.minutes,
    points: input.points,
  };
}

export function normalizeStationCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function clampCodeLength(length: number): number {
  return Math.min(
    STATION_ACCESS_CODE_MAX,
    Math.max(STATION_ACCESS_CODE_MIN, Math.round(length) || STATION_ACCESS_CODE_MIN),
  );
}
