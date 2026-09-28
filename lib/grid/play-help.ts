import type { ContentMode } from "@/lib/cms/layer-model";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import { isMediaInputMode, type LevelDefinition } from "@/lib/grid/level-types";
import {
  playHelpMenuHintFor,
  playHowToPlayHintFor,
  playRulesStepsFor,
} from "@/lib/grid/play-ui";

/** Human stall — no tap / no submit. Not used on the hub (walking is normal). */
export const PLAY_HELP_IDLE_MS = 3 * 60_000;
/** Human stall — similar wrong answers. */
export const PLAY_HELP_FAIL_HINT_AT = 3;

export const PLAY_RULES_STEPS = playRulesStepsFor("outdoor", "de");

export function playRulesSteps(
  mode: ContentMode = "outdoor",
  language?: string | null,
): ReadonlyArray<{ title: string; body: string }> {
  return playRulesStepsFor(mode, language);
}

export function playHelpMenuHint(mode: ContentMode, language?: string | null): string {
  return playHelpMenuHintFor(mode, language);
}

export function playHowToPlayHint(mode: ContentMode, language?: string | null): string {
  return playHowToPlayHintFor(mode, language);
}

export function levelHasUnusedTileHint(
  level: Pick<LevelDefinition, "level" | "tiles">,
  purchasedHints: Record<string, PurchasedTileHint>,
): boolean {
  return (level.tiles ?? []).some(
    (tile) => Boolean(tile.hint?.text?.trim()) && !purchasedHints[tile.id],
  );
}

export function levelAllowsSkip(
  level: Pick<LevelDefinition, "scoring" | "input_mode">,
): boolean {
  if (isMediaInputMode(level.input_mode)) return true;
  return Boolean(level.scoring?.allow_reveal_solution);
}
