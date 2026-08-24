"use client";

import { useEffect, useRef } from "react";
import { activateReadyBonuses } from "@/app/actions/game";
import { useWalkedDistance } from "@/lib/hooks/use-walked-distance";
import type { TeamGameState, TeamRealtimeState } from "@/lib/grid/game-state";

type Options = {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  gameState: TeamGameState;
  walkStorageKey: string | null;
  enabled?: boolean;
  /** Only the GPS lead device accumulates bonus meters (one team truth). */
  trackMeters?: boolean;
  onState: (state: TeamRealtimeState) => void;
};

/**
 * Ticks the Layer-3 bonus queue: time delays + meter walks → activateReadyBonuses.
 */
export function useBonusQueueTick({
  inviteCode,
  joinCode,
  sessionId,
  gameState,
  walkStorageKey,
  enabled = true,
  trackMeters = true,
  onState,
}: Options) {
  const queue = gameState.bonus_queue ?? [];
  const meterItems = queue.filter(
    (item) =>
      item.status === "armed" &&
      typeof item.meters_required === "number" &&
      item.meters_required > 0,
  );
  const needsMeterWalk = meterItems.length > 0;
  // One shared walk counter for all meter-armed bonuses (same journey after solve).
  const meterBonusKey =
    needsMeterWalk && trackMeters && walkStorageKey
      ? `${walkStorageKey}:bonus-meters`
      : null;

  const walk = useWalkedDistance(Boolean(enabled && trackMeters && needsMeterWalk), {
    storageKey: meterBonusKey,
  });

  const onStateRef = useRef(onState);
  onStateRef.current = onState;
  const inflightRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const hasArmedTime = queue.some(
      (item) =>
        item.status === "armed" &&
        item.ready_at &&
        !item.meters_required,
    );
    const hasArmedMeters = meterItems.length > 0;
    const hasReadyWaiting = queue.some((item) => item.status === "ready");

    if (!hasArmedTime && !hasArmedMeters && !hasReadyWaiting) return;

    let cancelled = false;

    async function tick() {
      if (cancelled || inflightRef.current) return;
      inflightRef.current = true;
      try {
        const walkedMetersByBonusId: Record<string, number> = {};
        if (needsMeterWalk && trackMeters) {
          const serverBonus = gameState.outdoor_progress?.bonus_walked_meters ?? 0;
          const meters = Math.max(walk.meters, serverBonus);
          for (const item of meterItems) {
            walkedMetersByBonusId[item.bonus_id] = meters;
          }
        }

        const result = await activateReadyBonuses({
          inviteCode,
          joinCode,
          sessionId,
          walkedMetersByBonusId,
        });
        if (!cancelled && result.success) {
          onStateRef.current(result.data);
        }
      } finally {
        inflightRef.current = false;
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 4000);

    function onVisible() {
      if (document.visibilityState === "visible") void tick();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [
    enabled,
    trackMeters,
    inviteCode,
    joinCode,
    sessionId,
    needsMeterWalk,
    walk.meters,
    gameState.outdoor_progress?.bonus_walked_meters,
    // Re-run when queue shape changes
    queue.map((i) => `${i.bonus_id}:${i.status}:${i.ready_at}`).join("|"),
    meterItems.length,
  ]);
}
