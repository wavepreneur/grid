/**
 * Player-facing role names (Alpha/Beta/Gamma stay technical in Studio).
 */

import type { ArchetypeRole } from "@/lib/grid/archetype-roles";
import type { BonusTask } from "@/lib/grid/level-types";

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

export function parseRoleDisplayLabels(raw: unknown): RoleDisplayLabels {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ROLE_LABELS };
  const o = raw as Partial<Record<keyof RoleDisplayLabels, unknown>>;
  return {
    alpha: typeof o.alpha === "string" && o.alpha.trim() ? o.alpha.trim() : DEFAULT_ROLE_LABELS.alpha,
    beta: typeof o.beta === "string" && o.beta.trim() ? o.beta.trim() : DEFAULT_ROLE_LABELS.beta,
    gamma: typeof o.gamma === "string" && o.gamma.trim() ? o.gamma.trim() : DEFAULT_ROLE_LABELS.gamma,
  };
}

export function displayRoleLabel(
  role: ArchetypeRole | string | null | undefined,
  labels?: RoleDisplayLabels | null,
): string {
  const map = labels ?? DEFAULT_ROLE_LABELS;
  const normalized = normalizeAudienceRole(role);
  return map[normalized];
}

function normalizeAudienceRole(
  role: ArchetypeRole | string | null | undefined,
): ArchetypeRole {
  if (role === "captain" || role === "navigator" || role === "alpha") return "alpha";
  if (role === "beta") return "beta";
  return "gamma";
}

export type BonusAudiencePlayer = {
  id: string;
  name: string;
  role?: string | null;
};

export type BonusAudienceTarget = Pick<BonusTask, "for_team" | "for_role"> & {
  for_player_id?: string | null;
};

/** Display names for a bonus — never Alpha/Beta/Gamma when a name exists. */
export function bonusAudiencePlayerNames(
  bonus: BonusAudienceTarget,
  players: BonusAudiencePlayer[],
): string[] {
  if (bonus.for_team) return [];
  const assignedId = bonus.for_player_id?.trim();
  if (assignedId) {
    const hit = players.find((p) => p.id === assignedId)?.name.trim();
    return hit ? [hit] : [];
  }
  const want = normalizeAudienceRole(bonus.for_role);
  const seen = new Set<string>();
  const names: string[] = [];
  for (const player of players) {
    if (!player.role) continue;
    if (normalizeAudienceRole(player.role) !== want) continue;
    const name = player.name.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
}

export function formatBonusAudienceNames(
  names: string[],
): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** How many person-icons to show for a bonus audience. */
export function bonusAudienceIconCount(
  bonus: Pick<BonusTask, "for_team" | "for_role">,
  nameCount?: number,
): 1 | 2 | 3 {
  if (bonus.for_team) return 3;
  if ((nameCount ?? 0) >= 3) return 3;
  if (nameCount === 2) return 2;
  return 1;
}

export function bonusAudienceHeadline(
  bonus: BonusAudienceTarget,
  labels?: RoleDisplayLabels | null,
  options?: {
    players?: BonusAudiencePlayer[];
    fallbackName?: string | null;
  },
): string {
  if (bonus.for_team) return "Ganzes Team";
  const names = bonusAudiencePlayerNames(bonus, options?.players ?? []);
  if (names.length > 0) return formatBonusAudienceNames(names);
  const fallback = options?.fallbackName?.trim();
  if (fallback) return fallback;
  return displayRoleLabel(bonus.for_role, labels);
}
