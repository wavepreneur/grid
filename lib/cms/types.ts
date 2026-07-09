/** GRID Studio CMS — shared types (games draft vs events live). */

export type StudioLanguage = "de" | "en";

export type StudioGameStatus = "draft" | "published" | "archived";

export type StudioTicketMode = "single" | "pool";

export type StudioTicketPoolStatus = "draft" | "active" | "paused" | "closed";

export type TaskTileDisplay = "icon" | "image";

export type TaskOpenMediaType = "none" | "image" | "audio" | "video" | "iframe";

export type TaskAnswerType = "text" | "number" | "choice";

export type StudioTaskContent = {
  question?: string;
  answer?: string;
  answer_type: TaskAnswerType;
  options?: Array<{ id: string; label: string }>;
  tile: {
    display: TaskTileDisplay;
    icon_key?: string;
    image_url?: string;
    label?: string;
    label_image_url?: string;
  };
  open_media: {
    type: TaskOpenMediaType;
    url?: string;
  };
};

export type StudioTask = {
  id: string;
  organization_id: string | null;
  slug: string;
  title: string;
  description: string;
  language: StudioLanguage;
  city_slug: string | null;
  game_type: string | null;
  tags: string[];
  content: StudioTaskContent;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StudioBlueprint = {
  id: string;
  organization_id: string | null;
  slug: string;
  name: string;
  description: string;
  accent_color: string;
  icon_key: string;
  preset_config: Record<string, unknown>;
  preset_logic: unknown[];
  is_system: boolean;
  sort_order: number;
};

export type StudioGame = {
  id: string;
  organization_id: string;
  blueprint_id: string | null;
  slug: string;
  name: string;
  logo_url: string | null;
  description: string;
  language: StudioLanguage;
  city_slug: string | null;
  duration_minutes: number | null;
  gps_enabled: boolean;
  farewell_text: string;
  feature_flags: Record<string, unknown>;
  logic_rules: unknown[];
  status: StudioGameStatus;
  published_version_number: number;
  is_template: boolean;
  created_at: string;
  updated_at: string;
};

export type StudioGameVersion = {
  id: string;
  game_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  published_at: string;
  publish_notes: string | null;
};

export type StudioTicketPool = {
  id: string;
  organization_id: string;
  game_id: string;
  game_version_id: string | null;
  name: string;
  mode: StudioTicketMode;
  max_activations: number | null;
  used_activations: number;
  max_players_per_activation: number;
  status: StudioTicketPoolStatus;
  created_at: string;
  updated_at: string;
  studio_games?: { name: string; slug: string } | null;
};

export type StudioOrganization = {
  id: string;
  slug: string;
  name: string;
};

export type TaskFilterInput = {
  organizationId?: string;
  language?: StudioLanguage | "";
  citySlug?: string;
  gameType?: string;
  search?: string;
};

export const DEFAULT_TASK_CONTENT: StudioTaskContent = {
  answer_type: "text",
  tile: {
    display: "icon",
    icon_key: "puzzle",
    label: "",
  },
  open_media: {
    type: "none",
  },
};

export const TASK_ICON_KEYS = [
  "puzzle",
  "map-pin",
  "key",
  "compass",
  "lock",
  "eye",
  "flag",
  "star",
] as const;

export type StudioGameTaskLink = {
  id: string;
  game_id: string;
  task_id: string;
  sort_order: number;
  overrides: Record<string, unknown>;
  task: StudioTask;
};

export type UpdateGameInput = {
  id: string;
  name?: string;
  description?: string;
  language?: StudioLanguage;
  city_slug?: string | null;
  duration_minutes?: number | null;
  gps_enabled?: boolean;
  farewell_text?: string;
  logo_url?: string | null;
  feature_flags?: Record<string, unknown>;
  logic_rules?: import("@/lib/cms/logic-rules").StudioLogicRule[];
};

export function slugifyStudio(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
