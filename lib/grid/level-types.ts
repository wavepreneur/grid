export type LevelType = "gps" | "digital" | "quiz";

export type PlayerRole = "captain" | "solver" | "navigator" | "alpha" | "beta" | "gamma";

export type LevelLocation = {
  lat: number;
  lng: number;
  radius_meters: number;
};

export type QuizOption = {
  id: string;
  label: string;
};

export type LevelTileType =
  | "image"
  | "video"
  | "audio"
  | "panorama_360"
  | "minigame"
  | "iframe"
  | "pdf";

export type LevelTileHint = {
  text: string;
  point_cost?: number;
};

/** Lean content reference — URL/embed only, max 10 per level. */
export type LevelContentTile = {
  id: string;
  type: LevelTileType;
  url: string;
  label?: string;
  /** Optional hint tied to this tile (default 50 points). */
  hint?: LevelTileHint;
};

export type LevelMedia = {
  video_url?: string;
  audio_url?: string;
  image_url?: string;
  iframe_url?: string;
};

export type LevelHint = {
  id: string;
  text: string;
  point_cost: number;
};

export type LevelTriggers = {
  type?: "sequential" | "time" | "distance" | "logic";
  after_minutes?: number;
  after_level?: number;
  after_meters?: number;
};

export type LevelDefinition = {
  level: number;
  type: LevelType;
  title: string;
  description: string;
  hero_image_url?: string;
  /** Up to 10 embed tiles (Cloudflare / iframe / mini-game links). */
  tiles?: LevelContentTile[];
  location?: LevelLocation;
  answer?: string;
  options?: QuizOption[];
  correct_option_id?: string;
  role_required?: PlayerRole | null;
  media?: LevelMedia;
  hints?: LevelHint[];
  triggers?: LevelTriggers;
};

export type RouteTemplate = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  levels: LevelDefinition[];
};

export type EventContentConfig = {
  template_slug?: string;
  city_slug?: string;
  /** Engine blueprint — exitmania (GPS) | tabbrain (digital/quiz only). */
  blueprint_slug?: "exitmania" | "tabbrain";
  /** Player UI module — exitmania | quiz | training (legacy fallback). */
  ui_layout?: "exitmania" | "quiz" | "training";
  show_live_score?: boolean;
  mission_duration_minutes?: number;
};

export type BlueprintCapabilities = {
  gps: boolean;
  navigatorRole: boolean;
};

export type EventRouteOverride = {
  levels?: Record<string, Partial<LevelDefinition>>;
};

export type ResolvedEventContent = {
  templateSlug: string;
  templateName: string;
  city: string | null;
  levels: LevelDefinition[];
  blueprintSlug: "exitmania" | "tabbrain";
  archetype: "ASYMMETRIC_INFORMANT" | "TIME_DECAY_SPRINT" | "COOPERATIVE_COLLECTIVE";
  capabilities: BlueprintCapabilities;
  uiLayout: "exitmania" | "quiz" | "training";
  showLiveScore: boolean;
  missionDurationMinutes: number;
};

export type GeolocationSample = {
  lat: number;
  lng: number;
  accuracy?: number;
};

export type SolveLevelPayload = {
  answer?: string;
  selectedOptionId?: string;
  geolocation?: GeolocationSample;
};

export const EXITMANIA_TOTAL_LEVELS = 10;
export const DEFAULT_TEMPLATE_SLUG = "default-exitmania";
export const DEFAULT_CITY_SLUG = "berlin";
export const DEFAULT_STARTING_SCORE = 1000;
export const HINT_POINT_COST = 50;
