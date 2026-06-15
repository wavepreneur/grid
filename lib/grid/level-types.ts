export type LevelType = "gps" | "digital" | "quiz";

export type PlayerRole = "captain" | "solver" | "navigator";

export type LevelLocation = {
  lat: number;
  lng: number;
  radius_meters: number;
};

export type QuizOption = {
  id: string;
  label: string;
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
};

export type EventRouteOverride = {
  levels?: Record<string, Partial<LevelDefinition>>;
};

export type ResolvedEventContent = {
  templateSlug: string;
  templateName: string;
  city: string | null;
  levels: LevelDefinition[];
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
