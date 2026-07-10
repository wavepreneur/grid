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

export type GameLinkOverrides = {
  location?: { lat: number; lng: number; radius_meters: number };
  gps?: { lat: number; lng: number; radius_meters: number };
  role?: RoleAssignment;
  trigger?: BonusTrigger;
};

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
