/**
 * GRID Layer Model — content architecture for scalable games.
 * @see docs/GRID_LAYER_MODEL.md
 * @see lib/grid/play-surface.ts
 */

export const STUDIO_LAYERS = [1, 2, 3] as const;
export type StudioLayer = (typeof STUDIO_LAYERS)[number];

/** Content authored for a specific surface (or any). */
export const CONTENT_CONTEXTS = ["outdoor", "indoor", "online", "any"] as const;
export type ContentContext = (typeof CONTENT_CONTEXTS)[number];

/** Live runtime surface — what the player hub shows. */
export const CONTENT_MODES = ["outdoor", "indoor", "online"] as const;
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
      "Standortbezogene Stops: Outdoor-GPS oder Indoor-Stationen mit Codes. Pro Stadt unterschiedlich.",
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
      "Globale Mission-Level (Tiles, Antwort) — einmal pflegen, Outdoor/Indoor/Online rendern.",
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
  | "indoor_escape"
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
  defaultMode: ContentMode;
  allowedFallbacks: ContentMode[];
};

export const LAYER_GAME_PRESETS: LayerGamePreset[] = [
  {
    id: "full",
    labelDe: "Vollständig (1 + 2 + 3)",
    descriptionDe: "Exitmania-Standard: Outdoor-GPS, Fallback Indoor oder Online.",
    activeLayers: [1, 2, 3],
    gpsEnabled: true,
    playMode: "sync_live",
    defaultMode: "outdoor",
    allowedFallbacks: ["indoor", "online"],
  },
  {
    id: "city_explorer",
    labelDe: "Stadt-Entdecker (1 + optional 3)",
    descriptionDe: "Orte entdecken, optional Bonus-Rätsel zwischendrin.",
    activeLayers: [1, 3],
    gpsEnabled: true,
    playMode: "sync_live",
    defaultMode: "outdoor",
    allowedFallbacks: ["indoor"],
  },
  {
    id: "geo_only",
    labelDe: "Nur Geo (1)",
    descriptionDe: "Ausschließlich standortbezogene Aufgaben.",
    activeLayers: [1],
    gpsEnabled: true,
    playMode: "sync_live",
    defaultMode: "outdoor",
    allowedFallbacks: ["indoor"],
  },
  {
    id: "indoor_escape",
    labelDe: "Indoor-Escape (1 + 2 + 3)",
    descriptionDe: "Venue mit Stationscodes — laufen ohne GPS, gleiche Missionen.",
    activeLayers: [1, 2, 3],
    gpsEnabled: false,
    playMode: "sync_live",
    defaultMode: "indoor",
    allowedFallbacks: ["online"],
  },
  {
    id: "mission",
    labelDe: "Mission / Online (2 + 3)",
    descriptionDe: "Tabbrain: remote am eigenen Gerät, Missions-Deck ohne GPS.",
    activeLayers: [2, 3],
    gpsEnabled: false,
    playMode: "sync_live",
    defaultMode: "online",
    allowedFallbacks: [],
  },
  {
    id: "micro_pulse",
    labelDe: "Micro-Pulse (3)",
    descriptionDe: "Kurze asymmetrische Aufgaben für Slack/Teams — nur Layer 3.",
    activeLayers: [3],
    gpsEnabled: false,
    playMode: "async_pulse",
    defaultMode: "online",
    allowedFallbacks: [],
  },
];

export type RuntimeModeProfile = {
  active_layers: StudioLayer[];
  /** Indoor: use station pack; online: skip Layer-1 hub. */
  layer_1_strategy?: "waypoints" | "stations" | "skip";
  layer_3_context?: ContentContext;
};

export type RoleDisplayLabels = {
  alpha: string;
  beta: string;
  gamma: string;
};

export const DEFAULT_ROLE_LABELS: RoleDisplayLabels = {
  alpha: "Team Lead",
  beta: "Profiler",
  gamma: "Organizer",
};

export type RuntimeProfiles = {
  default_mode: ContentMode;
  /** Fallbacks the customer/operator may switch to at event time. */
  allowed_fallbacks: ContentMode[];
  /**
   * @deprecated Use allowed_fallbacks.includes("indoor"). Kept for older JSON.
   */
  indoor_one_click: boolean;
  /**
   * linear = nacheinander (Karte zeigt alle, aktives Ziel hervorgehoben).
   * free = alle Aufgaben ab Start anlaufbar / lösbar.
   */
  route_order: "linear" | "free";
  /**
   * Player-facing names for Alpha/Beta/Gamma (Studio keeps technical keys).
   */
  role_labels: RoleDisplayLabels;
  profiles: Record<ContentMode, RuntimeModeProfile>;
};

export const DEFAULT_RUNTIME_PROFILES: RuntimeProfiles = {
  default_mode: "outdoor",
  allowed_fallbacks: ["indoor", "online"],
  indoor_one_click: true,
  route_order: "linear",
  role_labels: { ...DEFAULT_ROLE_LABELS },
  profiles: {
    outdoor: {
      active_layers: [1, 2, 3],
      layer_1_strategy: "waypoints",
      layer_3_context: "any",
    },
    indoor: {
      active_layers: [1, 2, 3],
      layer_1_strategy: "stations",
      layer_3_context: "indoor",
    },
    online: {
      active_layers: [2, 3],
      layer_1_strategy: "skip",
      layer_3_context: "online",
    },
  },
};

function parseRoleLabels(raw: unknown): RoleDisplayLabels {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ROLE_LABELS };
  const o = raw as Partial<Record<keyof RoleDisplayLabels, unknown>>;
  return {
    alpha:
      typeof o.alpha === "string" && o.alpha.trim() ? o.alpha.trim() : DEFAULT_ROLE_LABELS.alpha,
    beta: typeof o.beta === "string" && o.beta.trim() ? o.beta.trim() : DEFAULT_ROLE_LABELS.beta,
    gamma:
      typeof o.gamma === "string" && o.gamma.trim() ? o.gamma.trim() : DEFAULT_ROLE_LABELS.gamma,
  };
}

export type LayerFeatureCheck = {
  question: string;
  layers: StudioLayer[];
};

/** Decision checklist — run before building Studio features. */
export const LAYER_FEATURE_CHECKLIST: LayerFeatureCheck[] = [
  { question: "Layer 1 pro Stadt schnell anpassbar?", layers: [1] },
  { question: "Layer 2 global konsistent?", layers: [2] },
  { question: "Layer 3 Rollen/Trigger abbildbar?", layers: [3] },
  { question: "Runtime-Surface (Outdoor/Indoor/Online, Pulse)?", layers: [1, 2, 3] },
  { question: "Alpha/Beta/Gamma-Asymmetrie?", layers: [3] },
  { question: "Player-Phasen Hub → Quiz → Level → Bonus?", layers: [1, 2, 3] },
];

export function isStudioLayer(value: unknown): value is StudioLayer {
  return value === 1 || value === 2 || value === 3;
}

export function isContentMode(value: unknown): value is ContentMode {
  return value === "outdoor" || value === "indoor" || value === "online";
}

export function parseActiveLayers(raw: unknown): StudioLayer[] {
  if (!Array.isArray(raw)) return [1, 2, 3];
  const layers = raw.filter(isStudioLayer);
  return layers.length > 0 ? layers : [1, 2, 3];
}

export function parseContentContext(raw: unknown): ContentContext {
  if (raw === "outdoor" || raw === "indoor" || raw === "online" || raw === "any") {
    return raw;
  }
  return "any";
}

export function parseContentMode(raw: unknown): ContentMode {
  if (isContentMode(raw)) return raw;
  return "outdoor";
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

function parseModeProfile(
  raw: RuntimeModeProfile | undefined,
  fallback: RuntimeModeProfile,
): RuntimeModeProfile {
  if (!raw) return fallback;
  return {
    active_layers: parseActiveLayers(raw.active_layers ?? fallback.active_layers),
    layer_1_strategy:
      raw.layer_1_strategy === "waypoints" ||
      raw.layer_1_strategy === "stations" ||
      raw.layer_1_strategy === "skip"
        ? raw.layer_1_strategy
        : fallback.layer_1_strategy,
    layer_3_context: parseContentContext(raw.layer_3_context ?? fallback.layer_3_context),
  };
}

function parseAllowedFallbacks(
  raw: unknown,
  defaultMode: ContentMode,
  indoorOneClick: boolean,
): ContentMode[] {
  if (Array.isArray(raw)) {
    return raw.filter((m): m is ContentMode => isContentMode(m) && m !== defaultMode);
  }
  // Legacy: indoor_one_click true → indoor allowed
  if (indoorOneClick && defaultMode === "outdoor") return ["indoor", "online"];
  if (indoorOneClick) return ["indoor"];
  return [];
}

export function parseRuntimeProfiles(raw: unknown): RuntimeProfiles {
  if (!raw || typeof raw !== "object") return DEFAULT_RUNTIME_PROFILES;
  const obj = raw as Partial<RuntimeProfiles> & {
    profiles?: Partial<Record<ContentMode, RuntimeModeProfile>>;
  };
  const defaultMode = parseContentMode(obj.default_mode);
  const indoorOneClick = obj.indoor_one_click !== false;
  const outdoor = parseModeProfile(
    obj.profiles?.outdoor,
    DEFAULT_RUNTIME_PROFILES.profiles.outdoor,
  );
  const indoor = parseModeProfile(
    obj.profiles?.indoor,
    DEFAULT_RUNTIME_PROFILES.profiles.indoor,
  );
  const online = parseModeProfile(
    obj.profiles?.online,
    DEFAULT_RUNTIME_PROFILES.profiles.online,
  );

  // Migrate legacy indoor layer_1_fallback
  const legacyIndoor = obj.profiles?.indoor as
    | (RuntimeModeProfile & { layer_1_fallback?: string })
    | undefined;
  if (legacyIndoor?.layer_1_fallback === "skip" && !legacyIndoor.layer_1_strategy) {
    indoor.layer_1_strategy = "skip";
  } else if (legacyIndoor?.layer_1_fallback === "indoor_defaults" && !legacyIndoor.layer_1_strategy) {
    indoor.layer_1_strategy = "stations";
  }

  return {
    default_mode: defaultMode,
    allowed_fallbacks: parseAllowedFallbacks(obj.allowed_fallbacks, defaultMode, indoorOneClick),
    indoor_one_click: indoorOneClick,
    route_order: obj.route_order === "free" ? "free" : "linear",
    role_labels: parseRoleLabels(obj.role_labels),
    profiles: { outdoor, indoor, online },
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
    case "online":
      return "Online";
    case "any":
      return "Alle Surfaces";
  }
}

export function contentModeLabel(mode: ContentMode): string {
  switch (mode) {
    case "outdoor":
      return "Outdoor";
    case "indoor":
      return "Indoor";
    case "online":
      return "Online";
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
    player_phases: ["hub", "quiz", "level", "bonus"] as const,
  };
}
