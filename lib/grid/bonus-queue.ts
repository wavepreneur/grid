/**
 * Pure helpers for Layer-3 bonus queue evaluation.
 * @see docs/BONUS_LAYER3_MODEL.md
 */

import type { BonusQueueItem, TeamGameState } from "@/lib/grid/game-state";

export function promoteArmedBonuses(
  queue: BonusQueueItem[],
  nowIso: string,
  walkedMetersByBonusId: Record<string, number> = {},
): BonusQueueItem[] {
  return queue.map((item) => {
    if (item.status !== "armed") return item;

    if (item.meters_required && item.meters_required > 0) {
      const walked = walkedMetersByBonusId[item.bonus_id] ?? 0;
      if (walked + 0.05 >= item.meters_required) {
        return {
          ...item,
          status: "ready",
          ready_at: item.ready_at ?? nowIso,
        };
      }
      return item;
    }

    if (item.ready_at && item.ready_at <= nowIso) {
      return { ...item, status: "ready" };
    }

    return item;
  });
}

/** Pick next bonus to present: team first, then any ready solo not already active. */
export function pickBonusToActivate(
  queue: BonusQueueItem[],
): BonusQueueItem | null {
  const ready = queue.filter((item) => item.status === "ready");
  if (ready.length === 0) return null;

  const hasActive = queue.some((item) => item.status === "active");
  if (hasActive) return null;

  return ready.find((item) => item.for_team) ?? ready[0] ?? null;
}

export function markBonusActive(
  queue: BonusQueueItem[],
  bonusId: string,
): BonusQueueItem[] {
  return queue.map((item) =>
    item.bonus_id === bonusId && item.status === "ready"
      ? { ...item, status: "active" as const }
      : item,
  );
}

export function markBonusDone(
  queue: BonusQueueItem[],
  bonusId: string,
  now: Date,
): BonusQueueItem[] {
  const next: BonusQueueItem[] = [];

  for (const item of queue) {
    if (item.bonus_id !== bonusId) {
      next.push(item);
      continue;
    }

    next.push({ ...item, status: "done" });

    if (item.interval_minutes && item.interval_minutes > 0) {
      const readyAt = new Date(
        now.getTime() + item.interval_minutes * 60_000,
      ).toISOString();
      next.push({
        ...item,
        status: "armed",
        armed_at: now.toISOString(),
        ready_at: readyAt,
        fanfare_shown: false,
        task_snapshot: item.task_snapshot,
      });
    }
  }

  return next;
}

export function mergeBonusQueue(
  existing: BonusQueueItem[] | undefined,
  incoming: BonusQueueItem[],
): BonusQueueItem[] {
  const keep = (existing ?? []).filter(
    (item) =>
      item.status === "armed" ||
      item.status === "ready" ||
      item.status === "active",
  );
  const ids = new Set(incoming.map((i) => i.bonus_id));
  return [...keep.filter((i) => !ids.has(i.bonus_id)), ...incoming];
}

export function findPresentableBonusForRole(
  gameState: TeamGameState,
  role: string | null | undefined,
  options?: { claimUnassigned?: boolean },
): BonusQueueItem | null {
  const queue = gameState.bonus_queue ?? [];
  const normalized =
    role === "captain" || role === "navigator"
      ? "alpha"
      : role === "solver"
        ? "gamma"
        : role;

  const matches = (item: BonusQueueItem) =>
    item.for_team ||
    item.for_role === normalized ||
    Boolean(options?.claimUnassigned);

  const active = queue.find(
    (item) => item.status === "active" && matches(item),
  );
  if (active) return active;

  return (
    queue.find(
      (item) => item.status === "ready" && matches(item),
    ) ?? null
  );
}

/** Role-only bonuses currently being solved by someone else. */
export function findForeignActiveBonuses(
  gameState: TeamGameState,
  role: string | null | undefined,
  options?: { claimUnassigned?: boolean },
): BonusQueueItem[] {
  if (options?.claimUnassigned) return [];
  const queue = gameState.bonus_queue ?? [];
  const normalized =
    role === "captain" || role === "navigator"
      ? "alpha"
      : role === "solver"
        ? "gamma"
        : role;

  return queue.filter(
    (item) =>
      item.status === "active" &&
      !item.for_team &&
      item.for_role !== normalized,
  );
}
