import type { ContentMode } from "@/lib/cms/layer-model";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import { isMediaInputMode, type LevelDefinition } from "@/lib/grid/level-types";

/** Human stall — no tap / no submit. Not used on the hub (walking is normal). */
export const PLAY_HELP_IDLE_MS = 3 * 60_000;
/** Human stall — similar wrong answers. */
export const PLAY_HELP_FAIL_HINT_AT = 3;

export const GPS_SETTINGS_TIP =
  "Einstellungen → Standort für den Browser einschalten. Am Punkt bleiben — so macht das Spiel mehr Spaß.";

export const INDOOR_STATION_TIP =
  "Indoor braucht kein GPS. Sucht den Zettel an der Station und gebt den Code ein — so öffnet ihr die Aufgabe.";

export const ONLINE_SYNC_TIP =
  "Alle Geräte sollten dasselbe sehen. Seite neu laden, einen Moment warten, oder auf /go denselben Team-Code und deinen Namen eingeben.";

export const PLAY_RELOAD_TIP =
  "Wenn sich nichts mehr bewegen oder scrollen lässt: Seite neu laden. Ihr seid wieder genau hier — Punkte, Team und Stand bleiben.";

export const SKIPPED_LEVEL_HEADLINE = "Nicht gelöst";
export const SKIPPED_LEVEL_WALLET_HINT =
  "Den Hinweis holt ihr in der Wallet — gegen Punkte.";

export const PLAY_RULES_STEPS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Zum Pin laufen",
    body: "Die Karte zeigt den nächsten Punkt. Lauft dorthin.",
  },
  {
    title: "Team-Leitung öffnet",
    body: "Nur sie aktiviert die Aufgabe, wenn ihr nah genug seid.",
  },
  {
    title: "Zusammen rätseln",
    body: "Sobald die Aufgabe offen ist, darf jede Person tippen.",
  },
  {
    title: "Wenn ihr hängt",
    body: "Drei Punkte oben rechts: Tipp, Lösung oder Leitung wechseln (Menü → Team).",
  },
];

export function playRulesSteps(mode: ContentMode = "outdoor"): ReadonlyArray<{ title: string; body: string }> {
  if (mode === "indoor") {
    return [
      {
        title: "Zur Station",
        body: "Sucht den Zettel an der Station.",
      },
      {
        title: "Code eingeben",
        body: "Die Team-Leitung gibt den Code ein — so öffnet sich die Aufgabe.",
      },
      {
        title: "Zusammen rätseln",
        body: "Sobald die Aufgabe offen ist, darf jede Person tippen.",
      },
      {
        title: "Wenn ihr hängt",
        body: "Drei Punkte oben rechts: Tipp, Lösung oder Leitung wechseln (Menü → Team).",
      },
    ];
  }
  if (mode === "online") {
    return [
      {
        title: "Mission starten",
        body: "Die Team-Leitung startet. Alle Geräte sehen dieselbe Aufgabe.",
      },
      {
        title: "Zusammen rätseln",
        body: "Jede Person darf tippen, sobald die Aufgabe offen ist.",
      },
      {
        title: "Hinweise merken",
        body: "Was ihr löst, braucht ihr oft später. Schaut bei Bedarf in die Wallet.",
      },
      {
        title: "Wenn ihr hängt",
        body: "Drei Punkte oben rechts: Tipp, Lösung oder Leitung wechseln.",
      },
    ];
  }
  return PLAY_RULES_STEPS;
}

export function playHelpMenuHint(mode: ContentMode): string {
  switch (mode) {
    case "indoor":
      return "Code, Tipp oder anderes Handy";
    case "online":
      return "Tipp, Verbindung oder anderes Handy";
    default:
      return "GPS, Tipp oder anderes Handy";
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
  level: Pick<LevelDefinition, "scoring" | "input_mode">,
): boolean {
  if (isMediaInputMode(level.input_mode)) return true;
  return Boolean(level.scoring?.allow_reveal_solution);
}
