import type { LevelDefinition, SolveLevelPayload } from "@/lib/grid/level-types";

/** Human-readable solution shown after give-up / countdown expiry. */
export function formatLevelSolution(level: LevelDefinition): string {
  if (level.type === "quiz" && level.options?.length) {
    const ids = level.correct_option_ids?.length
      ? level.correct_option_ids
      : level.correct_option_id
        ? [level.correct_option_id]
        : [];
    const labels = level.options
      .filter((option) => ids.includes(option.id))
      .map((option) => option.label.trim())
      .filter(Boolean);
    if (labels.length > 0) return labels.join(", ");
  }

  if (level.input_mode === "confirm") return "OK";

  const answer = level.answer?.trim();
  if (answer) return answer;

  if (level.type === "gps") return "Am Zielpunkt";

  return "—";
}

/** What the team submitted, for the shared post-solve card. */
export function formatLevelAttemptLabel(
  level: LevelDefinition,
  payload: SolveLevelPayload,
): string | null {
  if (payload.selectedOptionIds?.length && level.options?.length) {
    const labels = level.options
      .filter((option) => payload.selectedOptionIds!.includes(option.id))
      .map((option) => option.label.trim())
      .filter(Boolean);
    return labels.length > 0 ? labels.join(", ") : null;
  }
  if (payload.selectedOptionId && level.options?.length) {
    const label = level.options.find((option) => option.id === payload.selectedOptionId)
      ?.label?.trim();
    return label || payload.selectedOptionId;
  }
  const typed = payload.answer?.trim();
  if (typed) return typed;
  if (level.input_mode === "confirm") return "OK";
  if (level.type === "gps") return "Am Zielpunkt";
  return null;
}
