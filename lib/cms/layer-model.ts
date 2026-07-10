/**
 * GRID Layer Model — content architecture for scalable games.
 * @see docs/GRID_LAYER_MODEL.md
 */

export const STUDIO_LAYERS = [1, 2, 3] as const;
export type StudioLayer = (typeof STUDIO_LAYERS)[number];

export const CONTENT_CONTEXTS = ["outdoor", "indoor", "any"] as const;
export type ContentContext = (typeof CONTENT_CONTEXTS)[number];

export const CONTENT_MODES = ["outdoor", "indoor"] as const;
export type ContentMode = (typeof CONTENT_MODES)[number];

export const ROLE_ASSIGNMENTS = ["alpha", "beta", "gamma", "team", "none"] as const;
export type RoleAssignment = (typeof ROLE_ASSIGNMENTS)[number];

export type LayerDefinition = {
  id: StudioLayer;
  labelDe: string;
  labelEn: string;
  shortDe: string;
  descriptionDe: string;
  gps: boolean;
  cityScoped: boolean;
  roleAware: boolean;
};

export const LAYER_DEFINITIONS: Record<StudioLayer, LayerDefinition> = {
  1: {
    id: 1,
    labelDe: "Layer 1 — Geo / Umgebung",
    labelEn: "Layer 1 — Geo / Environment",
    shortDe: "Geo",
    descriptionDe:
      "Standortbezogene Wegpunkte und Umgebungs-Quizzes. Pro Stadt unterschiedlich, per GPS oder Indoor-Fallback.",
    gps: true,
    cityScoped: true,
    roleAware: false,
  },
  2: {
    id: 2,
    labelDe: "Layer 2 — Mission",
    labelEn: "Layer 2 — Mission",
    shortDe: "Mission",
    descriptionDe:
      "Globale Mission-Level nach dem Freischalten. In allen Städten identisch — Story, Rätselblatt, Tiles.",
    gps: false,
    cityScoped: false,
    roleAware: false,
  },
  3: {
    id: 3,
    labelDe: "Layer 3 — Bonus / Rollen",
    labelEn: "Layer 3 — Bonus / Roles",
    shortDe: "Bonus",
    descriptionDe:
      "Asymmetrische Bonusaufgaben mit Triggern. Alpha/Beta/Gamma oder ganzes Team. Basis für Micro-Pulse.",
    gps: false,
    cityScoped: false,
    roleAware: true,
  },
};

export type LayerGamePresetId =
  | "full"
  | "city_explorer"
  | "mission"
  | "micro_pulse"
  | "geo_only"
  | "custom";

export type LayerGamePreset = {
  id: LayerGamePresetId;
  labelDe: string;
  descriptionDe: string;
  activeLayers: StudioLayer[];
  gpsEnabled: boolean;
  playMode: "sync_live" | "async_pulse";
};

export const LAYER_GAME_PRESETS: LayerGamePreset[] = [
  {
    id: "full",
    labelDe: "Vollständig (1 + 2 + 3)",
    descriptionDe: "Exitmania-Standard: GPS → Mission freischalten → Bonus.",
    activeLayers: [1, 2, 3],
    gpsEnabled: true,
    playMode: "sync_live",
  },
  {
    id: "city_explorer",
    labelDe: "Stadt-Entdecker (1 + optional 3)",
    descriptionDe: "Orte entdecken, optional Bonus-Rätsel zwischendrin.",
    activeLayers: [1, 3],
    gpsEnabled: true,
    playMode: "sync_live",
  },
  {
    id: "geo_only",
    labelDe: "Nur Geo (1)",
    descriptionDe: "Ausschließlich standortbezogene Aufgaben.",
    activeLayers: [1],
    gpsEnabled: true,
    playMode: "sync_live",
  },
  {
    id: "mission",
    labelDe: "Mission (2 + 3)",
    descriptionDe: "Story/Mission ohne GPS, mit Rollen-Bonus.",
    activeLayers: [2, 3],
    gpsEnabled: false,
    playMode: "sync_live",
  },
  {
    id: "micro_pulse",
    labelDe: "Micro-Pulse (3)",
    descriptionDe: "Kurze asymmetrische Aufgaben für Slack/Teams — nur Layer 3.",
    activeLayers: [3],
    gpsEnabled: false,
    playMode: "async_pulse",
  },
];

export type RuntimeModeProfile = {
  active_layers: StudioLayer[];
  layer_1_fallback?: "indoor_defaults" | "skip";
  layer_3_context?: ContentContext;
};

export type RuntimeProfiles = {
  default_mode: ContentMode;
  indoor_one_click: boolean;
  profiles: Record<ContentMode, RuntimeModeProfile>;
};

export const DEFAULT_RUNTIME_PROFILES: RuntimeProfiles = {
  default_mode: "outdoor",
  indoor_one_click: true,
  profiles: {
    outdoor: {
      active_layers: [1, 2, 3],
      layer_3_context: "any",
    },
    indoor: {
      active_layers: [2, 3],
      layer_1_fallback: "indoor_defaults",
      layer_3_context: "indoor",
    },
  },
};

export type LayerFeatureCheck = {
  question: string;
  layers: StudioLayer[];
};

/** Decision checklist — run before building Studio features. */
export const LAYER_FEATURE_CHECKLIST: LayerFeatureCheck[] = [
  { question: "Layer 1 pro Stadt schnell anpassbar?", layers: [1] },
  { question: "Layer 2 global konsistent?", layers: [2] },
  { question: "Layer 3 Rollen/Trigger abbildbar?", layers: [3] },
  { question: "Runtime-Switch (Indoor, Sprache, Pulse)?", layers: [1, 2, 3] },
  { question: "Alpha/Beta/Gamma-Asymmetrie?", layers: [3] },
];

export function isStudioLayer(value: unknown): value is StudioLayer {
  return value === 1 || value === 2 || value === 3;
}

export function parseActiveLayers(raw: unknown): StudioLayer[] {
  if (!Array.isArray(raw)) return [1, 2, 3];
  const layers = raw.filter(isStudioLayer);
  return layers.length > 0 ? layers : [1, 2, 3];
}

export function parseContentContext(raw: unknown): ContentContext {
  if (raw === "outdoor" || raw === "indoor" || raw === "any") return raw;
  return "any";
}

export function parseRoleAssignment(raw: unknown): RoleAssignment {
  if (
    raw === "alpha" ||
    raw === "beta" ||
    raw === "gamma" ||
    raw === "team" ||
    raw === "none"
  ) {
    return raw;
  }
  return "team";
}

export function parseRuntimeProfiles(raw: unknown): RuntimeProfiles {
  if (!raw || typeof raw !== "object") return DEFAULT_RUNTIME_PROFILES;
  const obj = raw as Partial<RuntimeProfiles>;
  const outdoor = obj.profiles?.outdoor ?? DEFAULT_RUNTIME_PROFILES.profiles.outdoor;
  const indoor = obj.profiles?.indoor ?? DEFAULT_RUNTIME_PROFILES.profiles.indoor;
  return {
    default_mode: obj.default_mode === "indoor" ? "indoor" : "outdoor",
    indoor_one_click: obj.indoor_one_click !== false,
    profiles: {
      outdoor: {
        active_layers: parseActiveLayers(outdoor.active_layers),
        layer_3_context: parseContentContext(outdoor.layer_3_context),
      },
      indoor: {
        active_layers: parseActiveLayers(indoor.active_layers),
        layer_1_fallback: indoor.layer_1_fallback === "skip" ? "skip" : "indoor_defaults",
        layer_3_context: parseContentContext(indoor.layer_3_context ?? "indoor"),
      },
    },
  };
}

export function detectPresetFromLayers(layers: StudioLayer[]): LayerGamePresetId {
  const key = [...layers].sort().join(",");
  const match = LAYER_GAME_PRESETS.find(
    (p) => [...p.activeLayers].sort().join(",") === key,
  );
  return match?.id ?? "custom";
}

export function taskMatchesContentMode(
  taskContext: ContentContext,
  mode: ContentMode,
): boolean {
  if (taskContext === "any") return true;
  return taskContext === mode;
}

export function isLayerActive(layer: StudioLayer, activeLayers: StudioLayer[]): boolean {
  return activeLayers.includes(layer);
}

export function layerLabel(layer: StudioLayer, lang: "de" | "en" = "de"): string {
  const def = LAYER_DEFINITIONS[layer];
  return lang === "de" ? def.shortDe : def.labelEn;
}

export function roleAssignmentLabel(role: RoleAssignment): string {
  switch (role) {
    case "alpha":
      return "Alpha (Karte/GPS)";
    case "beta":
      return "Beta (Rätselblatt)";
    case "gamma":
      return "Gamma (Aufgabe)";
    case "team":
      return "Ganzes Team";
    case "none":
      return "Keine Rolle";
  }
}

export function contentContextLabel(ctx: ContentContext): string {
  switch (ctx) {
    case "outdoor":
      return "Outdoor";
    case "indoor":
      return "Indoor";
    case "any":
      return "Outdoor & Indoor";
  }
}

/** @deprecated Layer is assigned on game links, not tasks. Use groupLinksByLayerOnLink. */
export function groupLinksByLayer<T extends { layer?: StudioLayer; overrides?: Record<string, unknown> }>(
  links: T[],
): Record<StudioLayer, T[]> {
  const grouped: Record<StudioLayer, T[]> = { 1: [], 2: [], 3: [] };
  for (const link of links) {
    const layer =
      link.layer === 1 || link.layer === 2 || link.layer === 3
        ? link.layer
        : isStudioLayer((link.overrides as { layer?: unknown })?.layer)
          ? ((link.overrides as { layer: StudioLayer }).layer)
          : 2;
    grouped[layer].push(link);
  }
  return grouped;
}

export function buildLayerSnapshotMeta(input: {
  activeLayers: StudioLayer[];
  runtimeProfiles: RuntimeProfiles;
}) {
  return {
    active_layers: input.activeLayers,
    runtime_profiles: input.runtimeProfiles,
    layer_definitions: LAYER_DEFINITIONS,
  };
}
