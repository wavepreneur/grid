import type { PlayerRole } from "@/lib/grid/level-types";
import type { RoleAssignment, StudioLayer } from "@/lib/cms/layer-model";
import type { StudioGameTaskLink } from "@/lib/cms/types";

export type BonusTriggerType =
  | "game_start"
  | "team_points_at_least"
  | "elapsed_minutes"
  | "after_task_solved";

export type BonusTrigger = {
  type: BonusTriggerType;
  points?: number;
  minutes?: number;
  source_task_id?: string;
  delay_seconds?: number;
};

/** When a mission stop becomes available (Layer-2 unlock). */
export type MissionUnlockType =
  | "previous"
  | "game_start"
  | "after_task"
  | "team_points"
  | "elapsed_minutes"
  | "after_task_delay";

export type MissionUnlock = {
  type: MissionUnlockType;
  /** For after_task / after_task_delay */
  source_task_id?: string;
  points?: number;
  /** Delay in minutes after source task (or from game start). */
  minutes?: number;
  /** Outdoor: meters after source task. */
  meters?: number;
};

export type StudioArrivalQuizOverride = {
  title?: string;
  image_url?: string;
  description?: string;
  question: string;
  options: Array<{ id: string; label: string; correct?: boolean }>;
  correct_option_id?: string;
  correct_option_ids?: string[];
  /** Bonus points when answered correctly (0 = unlock only). */
  points?: number;
  /** Side-fact after answer (from pool task success_info). */
  side_fact?: string;
};

export type GameLinkOverrides = {
  location?: { lat: number; lng: number; radius_meters: number };
  gps?: { lat: number; lng: number; radius_meters: number };
  role?: RoleAssignment;
  /** Who sees this mission (default: whole team). */
  visible_to?: RoleAssignment;
  trigger?: BonusTrigger;
  /** When this mission unlocks (default: previous in list). */
  unlock?: MissionUnlock;
  /** Opener quiz snapshot for this mission slot (Quiz → Level → Bonus). */
  arrival_quiz?: StudioArrivalQuizOverride;
  /** Pool task used as Einstiegsfrage (content snapshotted into arrival_quiz). */
  opener_task_id?: string;
  /** Points override for opener (default: task scoring.points). */
  opener_points?: number;
  /** Optional Layer-1 geo task linked to this mission slot. */
  geo_task_id?: string;
  /** Optional Layer-3 bonus task for this mission slot. */
  bonus_task_id?: string;
  /** Indoor station fields when authored on the mission/geo link. */
  station?: {
    name?: string;
    place?: string;
    code?: string;
    kind?: string;
  };
};

export const MISSION_UNLOCK_OPTIONS: Array<{
  value: MissionUnlockType;
  labelDe: string;
}> = [
  { value: "previous", labelDe: "Nach vorheriger Aufgabe" },
  { value: "game_start", labelDe: "Ab Spielstart" },
  { value: "after_task", labelDe: "Nach bestimmter Aufgabe" },
  { value: "team_points", labelDe: "Ab Team-Punkten" },
  { value: "elapsed_minutes", labelDe: "Nach Spielzeit" },
  { value: "after_task_delay", labelDe: "Nach Aufgabe + Zeit/Meter" },
];

export const BONUS_TRIGGER_OPTIONS: Array<{
  value: BonusTriggerType;
  labelDe: string;
}> = [
  { value: "game_start", labelDe: "Beim Spielstart" },
  { value: "team_points_at_least", labelDe: "Wenn Punkte erreicht" },
  { value: "elapsed_minutes", labelDe: "Nach Spielzeit (Minuten)" },
  { value: "after_task_solved", labelDe: "Nach gelöster Aufgabe" },
];

export function parseLinkLayer(link: Pick<StudioGameTaskLink, "layer" | "overrides">): StudioLayer {
  if (link.layer === 1 || link.layer === 2 || link.layer === 3) return link.layer;
  const raw = link.overrides?.layer;
  if (raw === 1 || raw === 2 || raw === 3) return raw;
  return 2;
}

export function parseLinkOverrides(raw: unknown): GameLinkOverrides {
  if (!raw || typeof raw !== "object") return {};
  return raw as GameLinkOverrides;
}

export function parseMissionUnlock(overrides: GameLinkOverrides): MissionUnlock {
  const u = overrides.unlock;
  if (!u?.type) return { type: "previous" };
  return {
    type: u.type,
    source_task_id: u.source_task_id,
    points: u.points,
    minutes: u.minutes,
    meters: u.meters,
  };
}

export function missionUnlockLabel(
  unlock: MissionUnlock,
  taskTitleById: Map<string, string>,
): string {
  switch (unlock.type) {
    case "previous":
      return "Nach vorheriger Aufgabe";
    case "game_start":
      return "Ab Spielstart";
    case "after_task": {
      const title = unlock.source_task_id
        ? taskTitleById.get(unlock.source_task_id) ?? "Aufgabe"
        : "Aufgabe";
      return `Nach „${title}“`;
    }
    case "team_points":
      return `Ab ${unlock.points ?? "?"} Punkten`;
    case "elapsed_minutes":
      return `Nach ${unlock.minutes ?? "?"} Min Spielzeit`;
    case "after_task_delay": {
      const title = unlock.source_task_id
        ? taskTitleById.get(unlock.source_task_id) ?? "Aufgabe"
        : "Aufgabe";
      const delay = unlock.minutes
        ? ` + ${unlock.minutes} Min`
        : unlock.meters
          ? ` + ${unlock.meters} m`
          : "";
      return `Nach „${title}“${delay}`;
    }
  }
}

export function parseBonusTrigger(overrides: GameLinkOverrides): BonusTrigger {
  const t = overrides.trigger;
  if (!t?.type) return { type: "game_start" };
  return {
    type: t.type,
    points: t.points,
    minutes: t.minutes,
    source_task_id: t.source_task_id,
    delay_seconds: t.delay_seconds,
  };
}

export function bonusTriggerLabel(
  trigger: BonusTrigger,
  taskTitleById: Map<string, string>,
): string {
  switch (trigger.type) {
    case "game_start":
      return "Beim Spielstart";
    case "team_points_at_least":
      return `Ab ${trigger.points ?? "?"} Punkten`;
    case "elapsed_minutes":
      return `Nach ${trigger.minutes ?? "?"} Minuten`;
    case "after_task_solved": {
      const title = trigger.source_task_id
        ? taskTitleById.get(trigger.source_task_id) ?? "Aufgabe"
        : "Aufgabe";
      const delay = trigger.delay_seconds
        ? ` (+${trigger.delay_seconds >= 60 ? `${Math.round(trigger.delay_seconds / 60)} Min` : `${trigger.delay_seconds}s`})`
        : "";
      return `Nach „${title}“${delay}`;
    }
  }
}

export function groupLinksByLayerOnLink<T extends Pick<StudioGameTaskLink, "layer" | "overrides" | "sort_order">>(
  links: T[],
): Record<StudioLayer, T[]> {
  const grouped: Record<StudioLayer, T[]> = { 1: [], 2: [], 3: [] };
  for (const link of links) {
    const layer = parseLinkLayer(link);
    grouped[layer].push(link);
  }
  for (const layer of [1, 2, 3] as StudioLayer[]) {
    grouped[layer].sort((a, b) => a.sort_order - b.sort_order);
  }
  return grouped;
}

export function roleAssignmentToPlayerRole(
  role: RoleAssignment | undefined,
): PlayerRole | null {
  if (role === "alpha" || role === "beta" || role === "gamma") return role;
  return null;
}

export function roleLabelShort(role: RoleAssignment | undefined): string {
  switch (role ?? "team") {
    case "alpha":
      return "Alpha";
    case "beta":
      return "Beta";
    case "gamma":
      return "Gamma";
    case "team":
      return "Alle";
    default:
      return "—";
  }
}
