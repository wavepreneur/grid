import type { PurchasedTileHint } from "@/lib/grid/game-state";
import type { LevelDefinition } from "@/lib/grid/level-types";

/** Human stall — no tap / no submit. Not used on the hub (walking is normal). */
export const PLAY_HELP_IDLE_MS = 5 * 60_000;
/** Human stall — similar wrong answers. */
export const PLAY_HELP_FAIL_HINT_AT = 3;

export const GPS_SETTINGS_TIP =
  "Prüft in den Geräteeinstellungen, ob Standort für den Browser eingeschaltet ist. Ihr könnt den Punkt auch ohne GPS freischalten — bleibt trotzdem in der Nähe, das Spielerlebnis ist so deutlich besser.";

export function levelHasUnusedTileHint(
  level: Pick<LevelDefinition, "level" | "tiles">,
  purchasedHints: Record<string, PurchasedTileHint>,
): boolean {
  return (level.tiles ?? []).some(
    (tile) => Boolean(tile.hint?.text?.trim()) && !purchasedHints[tile.id],
  );
}

export function levelAllowsSkip(
  level: Pick<LevelDefinition, "scoring">,
): boolean {
  return Boolean(level.scoring?.allow_reveal_solution);
}
