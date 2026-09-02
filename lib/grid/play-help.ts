import type { ContentMode } from "@/lib/cms/layer-model";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import type { LevelDefinition } from "@/lib/grid/level-types";

/** Human stall — no tap / no submit. Not used on the hub (walking is normal). */
export const PLAY_HELP_IDLE_MS = 5 * 60_000;
/** Human stall — similar wrong answers. */
export const PLAY_HELP_FAIL_HINT_AT = 3;

export const GPS_SETTINGS_TIP =
  "Prüft in den Geräteeinstellungen, ob Standort für den Browser eingeschaltet ist. Ihr könnt den Punkt auch ohne GPS freischalten — bleibt trotzdem in der Nähe, das Spielerlebnis ist so deutlich besser.";

export const INDOOR_STATION_TIP =
  "Indoor braucht kein GPS. Sucht den Zettel an der Station und gebt den Code ein — so öffnet ihr die Aufgabe.";

export const ONLINE_SYNC_TIP =
  "Alle Geräte sollten dasselbe sehen. Seite neu laden, einen Moment warten, oder im Team-Menü den Weiterspiel-Link und die Leitung nutzen.";

export function playHelpMenuHint(mode: ContentMode): string {
  switch (mode) {
    case "indoor":
      return "Code, Lösung, Verbindung — kurze Auswahl, dann der passende Hebel";
    case "online":
      return "Lösung, Verbindung, Geräte — kurze Auswahl, dann der passende Hebel";
    default:
      return "GPS, Lösung, Verbindung — kurze Auswahl, dann der passende Hebel";
  }
}

export function playHowToPlayHint(mode: ContentMode): string {
  switch (mode) {
    case "indoor":
      return "Stationen antippen, Code vom Zettel eingeben, dann Quiz und Aufgabe";
    case "online":
      return "Mission starten — alle Geräte lösen dasselbe, ohne Laufen";
    default:
      return "Zum Punkt laufen, Aufgabe öffnen, gemeinsam lösen";
  }
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
  level: Pick<LevelDefinition, "scoring">,
): boolean {
  return Boolean(level.scoring?.allow_reveal_solution);
}
