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

export type BonusAudience = "alpha" | "beta" | "gamma" | "team";

export type BonusBinding = {
  task_id: string;
  role: BonusAudience;
  when: BonusWhen;
};

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

export function parseBonusWhen(raw: unknown): BonusWhen {
  if (!raw || typeof raw !== "object") return { type: "immediate" };
  const o = raw as Partial<BonusWhen>;
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
    minutes: typeof o.minutes === "number" && o.minutes > 0 ? o.minutes : undefined,
    meters: typeof o.meters === "number" && o.meters > 0 ? o.meters : undefined,
  };
}

export function parseBonusBindings(overrides: GameLinkOverrides): BonusBinding[] {
  const raw = (overrides as GameLinkOverrides & { bonus_bindings?: unknown }).bonus_bindings;
  if (Array.isArray(raw) && raw.length > 0) {
    const out: BonusBinding[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Partial<BonusBinding>;
      if (typeof e.task_id !== "string" || !e.task_id.trim()) continue;
      const role: BonusAudience =
        e.role === "alpha" || e.role === "beta" || e.role === "gamma" || e.role === "team"
          ? e.role
          : "gamma";
      out.push({
        task_id: e.task_id.trim(),
        role,
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

  const legacyRole = overrides.role;
  const role: BonusAudience =
    legacyRole === "alpha" ||
    legacyRole === "beta" ||
    legacyRole === "gamma" ||
    legacyRole === "team"
      ? legacyRole
      : "gamma";

  // Legacy Layer-3 trigger delay_seconds → delay_minutes
  const trigger = overrides.trigger;
  let when: BonusWhen = { type: "immediate" };
  if (trigger?.type === "after_task_solved" && trigger.delay_seconds && trigger.delay_seconds > 0) {
    when = {
      type: "delay_minutes",
      minutes: Math.max(1, Math.round(trigger.delay_seconds / 60)),
    };
  }

  return [{ task_id: legacyId, role, when }];
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
