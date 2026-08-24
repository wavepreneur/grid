import type { CompiledGameLogic } from "@/lib/cms/logic-rules";
import type { ContentMode } from "@/lib/cms/layer-model";
import type { PlayPhase, PlaySurface } from "@/lib/grid/play-surface";

export type LevelType = "gps" | "digital" | "quiz" | "station";

export type PlayerRole = "captain" | "solver" | "navigator" | "alpha" | "beta" | "gamma";

export type LevelLocation = {
  lat: number;
  lng: number;
  radius_meters: number;
};

/** Indoor Layer-1 stop — code replaces geofence. */
export type StationKind = "puzzle" | "search" | "logic" | "team" | "finale";

export type LevelStation = {
  name: string;
  place: string;
  /** Default code on the physical sign; overridable per booking. */
  code: string;
  kind?: StationKind;
  minutes?: number;
  points?: number;
};

export type QuizOption = {
  id: string;
  label: string;
};

/** Multiple-choice unlock before the mission level (phase: quiz). */
export type ArrivalQuiz = {
  /** City-tour headline (from pool task title). */
  title?: string;
  /** Hero image for outdoor briefing. */
  image_url?: string;
  /** Short briefing under the title. */
  description?: string;
  question: string;
  options: QuizOption[];
  /** Primary / single correct (always set for UI fallback). */
  correct_option_id: string;
  /** When set, all listed options must be selected. */
  correct_option_ids?: string[];
  /** Bonus points when answered correctly (wrong still unlocks with 0). */
  points?: number;
  /** Side-fact after answer (city tour note). */
  side_fact?: string;
};

/** Layer-3 bonus after mission solve — role or whole team. */
export type BonusTask = {
  for_role: "alpha" | "beta" | "gamma";
  /** When true, every player sees/answers the bonus (for_role used as display only). */
  for_team?: boolean;
  title: string;
  intro?: string;
  question: string;
  options: QuizOption[];
  correct_option_id: string;
  correct_option_ids?: string[];
  reward: number;
};

/** When a compiled bonus may fire. @see docs/BONUS_LAYER3_MODEL.md */
export type BonusWhenCompiled = {
  type:
    | "immediate"
    | "delay_minutes"
    | "delay_meters"
    | "game_minutes"
    | "interval_minutes";
  minutes?: number;
  meters?: number;
};

/** Full Layer-3 bonus definition attached to a mission level. */
export type BonusDefinition = BonusTask & {
  id: string;
  when: BonusWhenCompiled;
  fanfare?: boolean;
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
  /** Optional cover image for the tile button (1:1). */
  cover_image_url?: string;
  /** Optional hint tied to this tile (default 50 points). */
  hint?: LevelTileHint;
};

export type LevelScoring = {
  points: number;
  countdown_seconds?: number | null;
  decay_enabled?: boolean;
  decay_floor?: number;
  /** Reveal solution + complete for 0 points (manual or countdown expiry). */
  allow_reveal_solution?: boolean;
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
  question?: string;
  hero_image_url?: string;
  /** Up to 10 embed tiles (Cloudflare / iframe / mini-game links). */
  tiles?: LevelContentTile[];
  location?: LevelLocation;
  /** Indoor hub entry for this slot (Layer 1 indoor). */
  station?: LevelStation;
  /**
   * Unlock quiz before tiles (phase quiz).
   * Outdoor/Indoor: environment quiz; Online: optional intro quiz.
   */
  arrival_quiz?: ArrivalQuiz;
  answer?: string;
  options?: QuizOption[];
  correct_option_id?: string;
  correct_option_ids?: string[];
  /** How the player enters the solution for digital levels. */
  input_mode?: "text" | "number" | "boxes" | "confirm";
  /** Boxes for input_mode "boxes" / legacy "number" (1–4). */
  number_fields?: 1 | 2 | 3 | 4;
  role_required?: PlayerRole | null;
  media?: LevelMedia;
  hints?: LevelHint[];
  triggers?: LevelTriggers;
  scoring?: LevelScoring;
  /** Optional teaser shown on online missions hub. */
  teaser?: string;
  /** Online hub: how material is split across roles (display only until extras ship). */
  role_split?: string;
  /** Layer-3 bonus after this mission is solved (legacy: first of `bonuses`). */
  bonus?: BonusTask;
  /** Full Layer-3 surprise list for this mission. @see docs/BONUS_LAYER3_MODEL.md */
  bonuses?: BonusDefinition[];
  /** Success overlay headline (with success_info). */
  success_title?: string;
  /** Note shown after solve — omit/empty = no success window. */
  success_info?: string;
};

/**
 * One stop as the player walks Hub → Quiz → Level → Bonus.
 * Content loader may still emit flat `levels[]`; UI resolves phases from this shape.
 */
export type PlaySlot = {
  index: number;
  title: string;
  /** Phase progress for this slot. */
  phase: PlayPhase;
  hub: {
    surface: PlaySurface;
    waypointName?: string;
    location?: LevelLocation;
    station?: LevelStation;
    teaser?: string;
    roleSplit?: string;
  };
  quiz?: ArrivalQuiz;
  /** Layer-2 mission payload (tiles + answer). */
  mission: LevelDefinition;
  /** Layer-3 bonus task id / inline payload — resolved at runtime. */
  bonusRole?: PlayerRole | null;
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
  /** Reference to a content pack in global_levels (e.g. berlin-classic). */
  content_pack_slug?: string;
  /** Engine blueprint — exitmania (GPS/indoor) | tabbrain (online). */
  blueprint_slug?: "exitmania" | "tabbrain";
  /** Player UI module — exitmania | quiz | training (legacy fallback). */
  ui_layout?: "exitmania" | "quiz" | "training";
  show_live_score?: boolean;
  mission_duration_minutes?: number;
  /** Studio game id — used by Studio test sessions to load live editor content. */
  cms_game_id?: string;
  /** Published version number at booking/test time (informational). */
  cms_version_number?: number;
  /** Studio playtest event — prefer live CMS compile over frozen snapshot. */
  is_studio_test?: boolean;
  /**
   * Active play surface for this event.
   * outdoor | indoor | online — see docs/GRID_LAYER_MODEL.md § Surfaces.
   */
  content_mode?: ContentMode;
  /** Surfaces the customer may switch to (subset of studio allowed_fallbacks). */
  allowed_fallbacks?: ContentMode[];
  /** Copied from studio game at booking/publish time when available. */
  runtime_profiles?: unknown;
};

export type BlueprintCapabilities = {
  gps: boolean;
  navigatorRole: boolean;
};

/** Per-booking Layer-1 deltas — GPS and/or station codes. */
export type StationRouteOverride = Partial<
  Pick<LevelStation, "code" | "place" | "name">
>;

export type EventRouteOverride = {
  levels?: Record<string, Partial<LevelDefinition>>;
  /** Indoor station overrides keyed by level number (string) or global_level id. */
  stations?: Record<string, StationRouteOverride>;
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
  /** Active play surface for this event. */
  contentMode: ContentMode;
  /** Surfaces the operator may switch to. */
  allowedFallbacks: ContentMode[];
  /** linear = sequential target; free = all active waypoints/stations. */
  routeOrder?: "linear" | "free";
  /** Studio publish snapshot — logic rules for bonus triggers at runtime. */
  compiledLogic?: CompiledGameLogic | null;
  /** Optional game-wide briefing shown from the play menu. */
  briefingText?: string | null;
  /** Fullscreen iframe URL for Kurzinformationen / rules (Studio link). */
  briefingIframeUrl?: string | null;
  /** Fullscreen iframe URL for FAQ / troubleshooting. */
  faqIframeUrl?: string | null;
  /** Optional game logo for lobby / onboarding. */
  logoUrl?: string | null;
  /** Player-facing Alpha/Beta/Gamma names for this game. */
  roleLabels?: import("@/lib/grid/role-labels").RoleDisplayLabels;
};

export type GeolocationSample = {
  lat: number;
  lng: number;
  accuracy?: number;
};

export type SolveLevelPayload = {
  answer?: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  geolocation?: GeolocationSample;
  /** Skip after revealing solution — awards 0 points when scoring allows it. */
  revealSolution?: boolean;
  /** Alpha lead override when GPS fails — server audits. */
  forceUnlock?: "geofence" | "distance";
};

export const EXITMANIA_TOTAL_LEVELS = 10;
export const DEFAULT_TEMPLATE_SLUG = "default-exitmania";
export const DEFAULT_CITY_SLUG = "berlin";
export const DEFAULT_STARTING_SCORE = 1000;
export const HINT_POINT_COST = 50;
