import type { LevelDefinition } from "@/lib/grid/level-types";

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
