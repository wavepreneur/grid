/**
 * Layer-3 bonus tasks shown after a slot's mission level.
 * @see frontend_idee/bonus.tsx
 */

import type { ArrivalQuiz, BonusTask, LevelDefinition, PlayerRole } from "@/lib/grid/level-types";
import { normalizeAnswer } from "@/lib/grid/content-engine";

export function parseBonusTask(raw: unknown): BonusTask | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const b = raw as Partial<BonusTask>;
  const role = b.for_role;
  if (role !== "alpha" && role !== "beta" && role !== "gamma") return undefined;
  if (typeof b.title !== "string" || typeof b.question !== "string") return undefined;

  const mode =
    b.answer_mode === "text" ||
    b.answer_mode === "boxes" ||
    b.answer_mode === "confirm" ||
    b.answer_mode === "choice"
      ? b.answer_mode
      : Array.isArray(b.options) && b.options.length > 0
        ? "choice"
        : typeof b.answer === "string" && b.answer.trim()
          ? "text"
          : null;
  if (!mode) return undefined;

  if (mode === "choice") {
    if (!Array.isArray(b.options) || typeof b.correct_option_id !== "string") return undefined;
  }
  if ((mode === "text" || mode === "boxes") && typeof b.answer !== "string") return undefined;

  return {
    for_role: role,
    for_team: Boolean(b.for_team),
    title: b.title,
    intro: typeof b.intro === "string" ? b.intro : undefined,
    description: typeof b.description === "string" ? b.description : undefined,
    hero_image_url:
      typeof b.hero_image_url === "string" && b.hero_image_url.trim()
        ? b.hero_image_url.trim()
        : undefined,
    question: b.question,
    options: Array.isArray(b.options) ? (b.options as BonusTask["options"]) : [],
    correct_option_id:
      typeof b.correct_option_id === "string" && b.correct_option_id
        ? b.correct_option_id
        : mode === "confirm"
          ? "done"
          : "__text__",
    correct_option_ids: Array.isArray(b.correct_option_ids)
      ? (b.correct_option_ids as string[])
      : undefined,
    reward: typeof b.reward === "number" ? b.reward : 150,
    answer_mode: mode === "choice" ? undefined : mode,
    answer: typeof b.answer === "string" ? b.answer : undefined,
    number_fields:
      b.number_fields === 1 ||
      b.number_fields === 2 ||
      b.number_fields === 3 ||
      b.number_fields === 4
        ? b.number_fields
        : undefined,
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

/**
 * Prefer the queue snapshot (exactly what the player saw) when scoring/presenting.
 */
export function resolveBonusForPlay(
  level: LevelDefinition | null | undefined,
  bonusId: string | null | undefined,
  snapshot?: BonusTask | null,
): BonusTask | null {
  if (snapshot) return snapshot;
  return findBonusTaskById(level, bonusId);
}

export function normalizeBonusRole(
  role: PlayerRole | string | null | undefined,
): "alpha" | "beta" | "gamma" | null {
  if (role === "captain" || role === "navigator" || role === "alpha") return "alpha";
  if (role === "beta") return "beta";
  if (role === "solver" || role === "gamma") return "gamma";
  return null;
}

export function isBonusForRole(
  bonus: BonusTask,
  role: PlayerRole | string | null | undefined,
): boolean {
  if (bonus.for_team) return true;
  const normalized = normalizeBonusRole(role);
  return normalized !== null && normalized === bonus.for_role;
}

/**
 * Who may see/solve a bonus on this device.
 * Solo / Alpha claims role bonuses when the target seat is empty — otherwise
 * a Gamma-only bonus is invisible in 1-person tests and never completes.
 */
export function canPresentBonus(
  bonus: Pick<BonusTask, "for_role" | "for_team">,
  role: PlayerRole | string | null | undefined,
  options?: { claimUnassigned?: boolean },
): boolean {
  if (isBonusForRole(bonus as BonusTask, role)) return true;
  return Boolean(options?.claimUnassigned);
}

/** Score a bonus submission (choice id or free-text / code). */
export function isBonusAnswerCorrect(bonus: BonusTask, submission: string): boolean {
  const mode =
    bonus.answer_mode ?? (bonus.options.length > 0 ? "choice" : "text");
  if (mode === "text" || mode === "boxes") {
    const expected = (bonus.answer ?? "").trim();
    const given = submission.trim();
    if (!given) return false;
    // No Studio solution configured → never award free points.
    if (!expected) return false;
    return normalizeAnswer(given) === normalizeAnswer(expected);
  }
  const correctIds =
    bonus.correct_option_ids && bonus.correct_option_ids.length > 0
      ? bonus.correct_option_ids
      : [bonus.correct_option_id];
  return correctIds.includes(submission);
}

/** What the team sees as the submitted attempt (choice label or typed text). */
export function formatBonusAttemptLabel(bonus: BonusTask, submission: string): string | null {
  const mode =
    bonus.answer_mode ?? (bonus.options.length > 0 ? "choice" : "text");
  if (mode === "choice" || mode === "confirm") {
    const label = bonus.options.find((opt) => opt.id === submission)?.label?.trim();
    return label || submission || null;
  }
  const typed = submission.trim();
  return typed || null;
}

/** Human-readable solution for post-answer reveal on bonus tasks. */
export function formatBonusSolution(bonus: BonusTask): string | null {
  const mode =
    bonus.answer_mode ?? (bonus.options.length > 0 ? "choice" : "text");
  if (mode === "confirm") return null;
  if (mode === "text" || mode === "boxes") {
    const answer = (bonus.answer ?? "").trim();
    return answer || null;
  }
  const correctIds =
    bonus.correct_option_ids && bonus.correct_option_ids.length > 0
      ? bonus.correct_option_ids
      : [bonus.correct_option_id];
  const labels = bonus.options
    .filter((opt) => correctIds.includes(opt.id))
    .map((opt) => opt.label.trim())
    .filter(Boolean);
  return labels.length > 0 ? labels.join(" · ") : null;
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
