/**
 * Player surfaces & phases — maps Lovable frontend_idee → GRID runtime.
 * @see docs/GRID_LAYER_MODEL.md § Surfaces
 * @see frontend_idee/ (outdoor / indoor / online hubs)
 */

import type { ContentMode } from "@/lib/cms/layer-model";

/** How the team enters and navigates stops. */
export const PLAY_SURFACES = ["outdoor", "indoor", "online"] as const;
export type PlaySurface = (typeof PLAY_SURFACES)[number];

/**
 * Fixed player flow per stop (same as frontend_idee):
 * Hub → Quiz (key) → Level (tiles) → Bonus (role, optional).
 */
export const PLAY_PHASES = ["hub", "quiz", "level", "bonus"] as const;
export type PlayPhase = (typeof PLAY_PHASES)[number];

export const PLAY_PHASE_ORDER: readonly PlayPhase[] = PLAY_PHASES;

export type HubKind = "map" | "stations" | "missions";

export type SurfacePresentation = {
  surface: PlaySurface;
  hubKind: HubKind;
  hubLabelDe: string;
  unitLabelDe: string;
  /** Shell: phone for co-located play, stage for remote multi-device. */
  shell: "phone" | "stage";
  /** Product default for this surface. */
  product: "exitmania" | "tabbrain";
  usesGps: boolean;
  usesStationCodes: boolean;
};

export const SURFACE_PRESENTATION: Record<PlaySurface, SurfacePresentation> = {
  outdoor: {
    surface: "outdoor",
    hubKind: "map",
    hubLabelDe: "Karte",
    unitLabelDe: "Wegpunkt",
    shell: "phone",
    product: "exitmania",
    usesGps: true,
    usesStationCodes: false,
  },
  indoor: {
    surface: "indoor",
    hubKind: "stations",
    hubLabelDe: "Stationen",
    unitLabelDe: "Station",
    shell: "phone",
    product: "exitmania",
    usesGps: false,
    usesStationCodes: true,
  },
  online: {
    surface: "online",
    hubKind: "missions",
    hubLabelDe: "Missionen",
    unitLabelDe: "Mission",
    shell: "stage",
    product: "tabbrain",
    usesGps: false,
    usesStationCodes: false,
  },
};

export function isPlaySurface(value: unknown): value is PlaySurface {
  return value === "outdoor" || value === "indoor" || value === "online";
}

export function contentModeToSurface(mode: ContentMode): PlaySurface {
  return mode;
}

export function nextPlayPhase(phase: PlayPhase): PlayPhase | null {
  const idx = PLAY_PHASE_ORDER.indexOf(phase);
  if (idx < 0 || idx >= PLAY_PHASE_ORDER.length - 1) return null;
  return PLAY_PHASE_ORDER[idx + 1]!;
}

export function hubPathForSurface(surface: PlaySurface): string {
  return `/${surface}`;
}
