"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Studio test: desk buttons may add meters or force-show the bonus. */
  isStudioTest?: boolean;
  onState: (state: TeamRealtimeState) => void;
};

export type DeskMeterBonus = {
  requiredMeters: number;
  walkedMeters: number;
  addDeskMeters: () => void;
  showBonusNow: () => void;
};

/**
 * Ticks the Layer-3 bonus queue: time delays + meter walks → activateReadyBonuses.
 * No extra radio for desk tests — only the same click/walk path.
 */
export function useBonusQueueTick({
  inviteCode,
  joinCode,
  sessionId,
  gameState,
  walkStorageKey,
  enabled = true,
  trackMeters = true,
  isStudioTest = false,
  onState,
}: Options): { deskMeterBonus: DeskMeterBonus | null } {
  const queue = gameState.bonus_queue ?? [];
  const meterItems = queue.filter(
    (item) =>
      item.status === "armed" &&
      typeof item.meters_required === "number" &&
      item.meters_required > 0,
  );
  const needsMeterWalk = meterItems.length > 0;
  const requiredMeters = Math.max(0, ...meterItems.map((item) => item.meters_required ?? 0));
  const [deskMeters, setDeskMeters] = useState(0);
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
    if (!needsMeterWalk) setDeskMeters(0);
  }, [needsMeterWalk]);

  const walkedMeters = Math.max(
    walk.meters,
    gameState.outdoor_progress?.bonus_walked_meters ?? 0,
    deskMeters,
  );

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
          for (const item of meterItems) {
            walkedMetersByBonusId[item.bonus_id] = walkedMeters;
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
    walkedMeters,
    // Re-run when queue shape changes
    queue.map((i) => `${i.bonus_id}:${i.status}:${i.ready_at}`).join("|"),
    meterItems.length,
  ]);

  const showBonusNow = useCallback(() => {
    void activateReadyBonuses({
      inviteCode,
      joinCode,
      sessionId,
      walkedMetersByBonusId: Object.fromEntries(
        meterItems.map((item) => [item.bonus_id, item.meters_required ?? requiredMeters]),
      ),
      studioForceReady: true,
    }).then((result) => {
      if (result.success) onStateRef.current(result.data);
    });
  }, [inviteCode, joinCode, meterItems, requiredMeters, sessionId]);

  const deskMeterBonus =
    isStudioTest && trackMeters && needsMeterWalk
      ? {
          requiredMeters,
          walkedMeters,
          addDeskMeters: () => setDeskMeters((current) => current + 25),
          showBonusNow,
        }
      : null;

  return { deskMeterBonus };
}
