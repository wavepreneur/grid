export type LevelType = "gps" | "digital" | "quiz";

export type LevelLocation = {
  lat: number;
  lng: number;
  radius_meters: number;
};

export type QuizOption = {
  id: string;
  label: string;
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
