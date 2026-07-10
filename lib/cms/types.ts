/** GRID Studio CMS — shared types (games draft vs events live). */

import type {
  ContentContext,
  RoleAssignment,
  RuntimeProfiles,
  StudioLayer,
} from "@/lib/cms/layer-model";
import { DEFAULT_RUNTIME_PROFILES } from "@/lib/cms/layer-model";

export type { ContentContext, RoleAssignment, RuntimeProfiles, StudioLayer };

export type StudioLanguage = "de" | "en";

export type StudioGameStatus = "draft" | "published" | "archived";

export type StudioTicketMode = "single" | "pool";

export type StudioTicketPoolStatus = "draft" | "active" | "paused" | "closed";

export type TaskTileMediaType = "image" | "audio" | "video" | "iframe";

export type TaskAnswerType = "text" | "choice" | "multi_choice";

export type TaskContentTile = {
  id: string;
  /** Cover image — fills the clickable tile in-game (1:1). */
  cover_image_url?: string;
  media_type: TaskTileMediaType;
  media_url: string;
  label?: string;
  /** Optional purchasable hint tied to this kachel's content. */
  hint_text?: string;
  hint_point_cost?: number;
};

export type TaskScoring = {
  /** Reward on solve — negative values subtract from team score. */
  points: number;
  countdown_seconds?: number | null;
  decay_enabled?: boolean;
  /** Minimum reachable points when decay is on (usually 0). */
  decay_floor?: number;
};

export type StudioTaskContent = {
  hero_image_url?: string;
  question?: string;
  answer?: string;
  answer_type: TaskAnswerType;
  options?: Array<{ id: string; label: string; correct?: boolean }>;
  tiles?: TaskContentTile[];
  scoring?: TaskScoring;
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
  layer: StudioLayer;
  content_context: ContentContext;
  role_assignment: RoleAssignment;
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
  active_layers: StudioLayer[];
  runtime_profiles: RuntimeProfiles;
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
  layer?: StudioLayer | "";
  contentContext?: ContentContext | "";
  search?: string;
};

export const DEFAULT_TASK_CONTENT: StudioTaskContent = {
  answer_type: "text",
  tiles: [],
  scoring: {
    points: 100,
    countdown_seconds: null,
    decay_enabled: false,
    decay_floor: 0,
  },
};

export type StudioGameTaskLink = {
  id: string;
  game_id: string;
  task_id: string;
  layer: StudioLayer;
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
  active_layers?: StudioLayer[];
  runtime_profiles?: RuntimeProfiles;
};

export { DEFAULT_RUNTIME_PROFILES };

export function slugifyStudio(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
