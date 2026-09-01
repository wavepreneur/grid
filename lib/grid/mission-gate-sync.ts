"use client";

import { getRealtimeAccessToken } from "@/app/actions/realtime";
import { getPlayRealtimeClient } from "@/lib/supabase/realtime-browser";

/**
 * Hold fast devices until teammates signal they are also in the gate,
 * so the team enters the first level together.
 */
export async function waitForTeamGateReady(input: {
  sessionId: string;
  teamId: string;
  playerId: string;
  expectedCount: number;
  startedAt: number;
}): Promise<void> {
  const expected = Math.max(1, Math.floor(input.expectedCount));
  if (expected <= 1) return;

  const tokenResult = await getRealtimeAccessToken(input.sessionId);
  if (!tokenResult.success) return;

  const supabase = getPlayRealtimeClient({
    sessionId: input.sessionId,
    accessToken: tokenResult.data.accessToken,
  });

  const readyIds = new Set<string>([input.playerId]);
  const ownReadyAt = Date.now();
  const startedAt = input.startedAt > 0 ? input.startedAt : ownReadyAt;
  const deadline = Math.min(startedAt + 10_000, ownReadyAt + 6_000);

  await new Promise<void>((resolve) => {
    let settled = false;
    const channel = supabase.channel(`grid-team:${input.teamId}`, {
      config: { broadcast: { ack: false, self: false } },
    });

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearInterval(pulse);
      void supabase.removeChannel(channel).finally(() => resolve());
    };

    const ping = () =>
      channel.send({
        type: "broadcast",
        event: "grid",
        payload: { type: "gate_ready", player_id: input.playerId },
      });

    channel.on("broadcast", { event: "grid" }, (msg) => {
      const payload = (msg.payload ?? {}) as { type?: string; player_id?: string };
      if (payload.type !== "gate_ready" || !payload.player_id) return;
      readyIds.add(payload.player_id);
      if (readyIds.size >= expected) finish();
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") void ping();
    });

    const pulse = window.setInterval(() => {
      if (settled) return;
      if (Date.now() >= deadline || readyIds.size >= expected) {
        finish();
        return;
      }
      void ping();
    }, 280);

    window.setTimeout(finish, Math.max(200, deadline - Date.now()));
  });
}
