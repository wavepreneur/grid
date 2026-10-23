/**
 * Layer-3 bonus bindings on a mission slot.
 * @see docs/BONUS_LAYER3_MODEL.md
 */

import type { GameLinkOverrides } from "@/lib/cms/game-link-config";

export type BonusWhenType =
  | "immediate"
  | "delay_minutes"
  | "delay_meters"
  | "game_minutes"
  | "interval_minutes";

export type BonusWhen = {
  type: BonusWhenType;
  /** Minutes after mission solve / game start / interval period. */
  minutes?: number;
  /** Meters walked after mission solve. */
  meters?: number;
};

export type BonusAudience = "alpha" | "beta" | "gamma" | "delta" | "team";

/** How many people in the audience get the bonus. Default: one. */
export type BonusScope = "one" | "all";

export type BonusBinding = {
  task_id: string;
  role: BonusAudience;
  /** Default `one` — author must pick `all` for everyone in the audience. */
  scope: BonusScope;
  when: BonusWhen;
};

export const BONUS_SCOPE_OPTIONS: Array<{
  value: BonusScope;
  label: string;
  hint: string;
}> = [
  {
    value: "one",
    label: "Genau eine Person",
    hint: "Eine Person bekommt die Aufgabe. Fehlt die Rolle (z. B. kein Delta), fällt es auf Alpha.",
  },
  {
    value: "all",
    label: "Alle",
    hint: "Jeder in der Zielgruppe sieht dieselbe Bonusaufgabe.",
  },
];

export const BONUS_WHEN_OPTIONS: Array<{
  value: BonusWhenType;
  label: string;
  hint: string;
}> = [
  {
    value: "immediate",
    label: "Sofort nach gelöster Mission",
    hint: "Direkt nach dem Lösen — Überraschungs-Moment",
  },
  {
    value: "delay_minutes",
    label: "Nach Mission + Minuten",
    hint: "z. B. 5 Min später — zweiter Bonus in der Kette",
  },
  {
    value: "delay_meters",
    label: "Nach Mission + Meter",
    hint: "Sobald das Team X Meter seit dem Lösen gelaufen ist",
  },
  {
    value: "game_minutes",
    label: "Ab Spielminute",
    hint: "Unabhängig von dieser Mission — z. B. bei Minute 20",
  },
  {
    value: "interval_minutes",
    label: "Alle X Minuten",
    hint: "Wiederkehrend (startet nach dieser Mission)",
  },
];

function positiveNumber(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function parseBonusWhen(raw: unknown): BonusWhen {
  if (!raw || typeof raw !== "object") return { type: "immediate" };
  const o = raw as Partial<BonusWhen> & { minutes?: unknown; meters?: unknown };
  const type = o.type;
  if (
    type !== "immediate" &&
    type !== "delay_minutes" &&
    type !== "delay_meters" &&
    type !== "game_minutes" &&
    type !== "interval_minutes"
  ) {
    return { type: "immediate" };
  }
  return {
    type,
    minutes: positiveNumber(o.minutes),
    meters: positiveNumber(o.meters),
  };
}

/** True when Studio has written bonus_bindings — including an empty list. */
export function hasAuthoredBonusBindings(overrides: GameLinkOverrides): boolean {
  return Array.isArray(overrides.bonus_bindings);
}

export function parseBonusAudience(raw: unknown): BonusAudience {
  if (
    raw === "alpha" ||
    raw === "beta" ||
    raw === "gamma" ||
    raw === "delta" ||
    raw === "team"
  ) {
    return raw;
  }
  return "gamma";
}

/**
 * Missing scope: role `team` → `all` (legacy Ganzes Team), otherwise `one`.
 * New Studio bindings always write an explicit scope (default `one`).
 */
export function parseBonusScope(raw: unknown, role: BonusAudience): BonusScope {
  if (raw === "all" || raw === "one") return raw;
  return role === "team" ? "all" : "one";
}

export function parseBonusBindings(overrides: GameLinkOverrides): BonusBinding[] {
  const raw = (overrides as GameLinkOverrides & { bonus_bindings?: unknown }).bonus_bindings;
  if (Array.isArray(raw)) {
    const out: BonusBinding[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Partial<BonusBinding> & { scope?: unknown };
      if (typeof e.task_id !== "string" || !e.task_id.trim()) continue;
      const role = parseBonusAudience(e.role);
      out.push({
        task_id: e.task_id.trim(),
        role,
        scope: parseBonusScope(e.scope, role),
        when: parseBonusWhen(e.when),
      });
    }
    return out;
  }

  // Legacy: single bonus_task_id
  const legacyId =
    typeof overrides.bonus_task_id === "string" && overrides.bonus_task_id.trim()
      ? overrides.bonus_task_id.trim()
      : null;
  if (!legacyId) return [];

  const role = parseBonusAudience(overrides.role);

  // Legacy Layer-3 trigger delay_seconds → delay_minutes
  const trigger = overrides.trigger;
  let when: BonusWhen = { type: "immediate" };
  if (trigger?.type === "after_task_solved" && trigger.delay_seconds && trigger.delay_seconds > 0) {
    when = {
      type: "delay_minutes",
      minutes: Math.max(1, Math.round(trigger.delay_seconds / 60)),
    };
  }

  return [{ task_id: legacyId, role, scope: parseBonusScope(undefined, role), when }];
}

export function bonusWhenLabel(when: BonusWhen): string {
  switch (when.type) {
    case "immediate":
      return "Sofort nach Mission";
    case "delay_minutes":
      return `+${when.minutes ?? "?"} Min nach Mission`;
    case "delay_meters":
      return `+${when.meters ?? "?"} m nach Mission`;
    case "game_minutes":
      return `Ab Spielminute ${when.minutes ?? "?"}`;
    case "interval_minutes":
      return `Alle ${when.minutes ?? "?"} Min`;
  }
}
