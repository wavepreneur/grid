/**
 * Layer-3 bonus tasks shown after a slot's mission level.
 * @see frontend_idee/bonus.tsx
 */

import type { ArrivalQuiz, BonusTask, LevelDefinition, PlayerRole } from "@/lib/grid/level-types";

export function parseBonusTask(raw: unknown): BonusTask | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const b = raw as Partial<BonusTask>;
  const role = b.for_role;
  if (role !== "alpha" && role !== "beta" && role !== "gamma") return undefined;
  if (typeof b.title !== "string" || typeof b.question !== "string") return undefined;
  if (!Array.isArray(b.options) || typeof b.correct_option_id !== "string") return undefined;
  return {
    for_role: role,
    for_team: Boolean(b.for_team),
    title: b.title,
    intro: typeof b.intro === "string" ? b.intro : undefined,
    question: b.question,
    options: b.options as BonusTask["options"],
    correct_option_id: b.correct_option_id,
    correct_option_ids: Array.isArray(b.correct_option_ids)
      ? (b.correct_option_ids as string[])
      : undefined,
    reward: typeof b.reward === "number" ? b.reward : 150,
  };
}

/** Resolve bonus for a completed mission slot. */
export function resolveBonusTask(level: LevelDefinition | null | undefined): BonusTask | null {
  if (!level) return null;
  if (level.bonuses?.length) {
    const first = level.bonuses[0];
    if (first) {
      const { id: _id, when: _when, fanfare: _f, ...task } = first;
      return task;
    }
  }
  if (level.bonus) return level.bonus;
  return null;
}

/** All bonuses for a mission (compiled list or legacy single). */
export function resolveBonusDefinitions(
  level: LevelDefinition | null | undefined,
): import("@/lib/grid/level-types").BonusDefinition[] {
  if (!level) return [];
  if (level.bonuses?.length) return level.bonuses;
  if (level.bonus) {
    return [
      {
        ...level.bonus,
        id: `legacy-${level.level}`,
        when: { type: "immediate" },
        fanfare: true,
      },
    ];
  }
  return [];
}

export function findBonusDefinition(
  level: LevelDefinition | null | undefined,
  bonusId: string | null | undefined,
): import("@/lib/grid/level-types").BonusDefinition | null {
  if (!level || !bonusId) return null;
  const defs = resolveBonusDefinitions(level);
  return defs.find((d) => d.id === bonusId) ?? null;
}

/** Content-only BonusTask from a definition (or legacy first). */
export function bonusDefinitionToTask(
  def: import("@/lib/grid/level-types").BonusDefinition | null | undefined,
): BonusTask | null {
  if (!def) return null;
  const { id: _id, when: _when, fanfare: _f, ...task } = def;
  return task;
}

export function findBonusTaskById(
  level: LevelDefinition | null | undefined,
  bonusId: string | null | undefined,
): BonusTask | null {
  if (bonusId) {
    return bonusDefinitionToTask(findBonusDefinition(level, bonusId));
  }
  return resolveBonusTask(level);
}

export function isBonusForRole(
  bonus: BonusTask,
  role: PlayerRole | string | null | undefined,
): boolean {
  if (bonus.for_team) return true;
  const normalized =
    role === "captain" || role === "navigator"
      ? "alpha"
      : role === "solver"
        ? "gamma"
        : role;
  return normalized === bonus.for_role;
}

export function roleLabelDe(role: BonusTask["for_role"]): string {
  switch (role) {
    case "alpha":
      return "Alpha";
    case "beta":
      return "Beta";
    case "gamma":
      return "Gamma";
  }
}

/** Build a demo bonus from an arrival quiz shape (content authoring helper). */
export function bonusFromQuiz(
  quiz: ArrivalQuiz,
  forRole: BonusTask["for_role"] = "gamma",
  reward = 150,
): BonusTask {
  return {
    for_role: forRole,
    title: `Bonusaufgabe für ${roleLabelDe(forRole)}`,
    intro: `Nur ${roleLabelDe(forRole)} darf diese Aufgabe sehen.`,
    question: quiz.question,
    options: quiz.options,
    correct_option_id: quiz.correct_option_id,
    reward,
  };
}
