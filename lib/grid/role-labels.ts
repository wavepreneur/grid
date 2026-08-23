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
  const normalized =
    role === "captain" || role === "navigator" || role === "alpha"
      ? "alpha"
      : role === "beta"
        ? "beta"
        : "gamma";
  return map[normalized];
}

/** How many person-icons to show for a bonus audience. */
export function bonusAudienceIconCount(bonus: Pick<BonusTask, "for_team" | "for_role">): 1 | 2 | 3 {
  if (bonus.for_team) return 3;
  return 1;
}

export function bonusAudienceHeadline(
  bonus: Pick<BonusTask, "for_team" | "for_role">,
  labels?: RoleDisplayLabels | null,
): string {
  if (bonus.for_team) return "Ganzes Team";
  return displayRoleLabel(bonus.for_role, labels);
}
