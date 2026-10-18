import { createAdminClient } from "@/lib/supabase/admin";

const SUBSCRIBE_MS = 1500;

/**
 * Battery: no extra phone poll. Live devices already sit on `grid-team:{id}`.
 * Operator push rides that socket; a missed ping is picked up on screen-wake.
 */
export async function pingTeamsContentUpdated(
  eventIds: string[],
  revision: number,
): Promise<void> {
  if (eventIds.length === 0) return;

  const supabase = createAdminClient();
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id")
    .in("event_id", eventIds)
    .neq("status", "disbanded");

  if (error) throw new Error(error.message);

  const ids = (teams ?? []).map((row) => row.id as string);
  const queue = [...ids];
  const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
    while (queue.length > 0) {
      const teamId = queue.shift();
      if (!teamId) return;
      await pingOneTeam(supabase, teamId, revision);
    }
  });
  await Promise.all(workers);
}

async function pingOneTeam(
  supabase: ReturnType<typeof createAdminClient>,
  teamId: string,
  revision: number,
): Promise<void> {
  const channel = supabase.channel(`grid-team:${teamId}`, {
    config: { broadcast: { ack: false } },
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("subscribe timeout")), SUBSCRIBE_MS);
      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        clearTimeout(timer);
        resolve();
      });
    });
    await channel.send({
      type: "broadcast",
      event: "grid",
      payload: { type: "content_updated", seq: revision },
    });
  } catch {
    /* Phone will catch up on visibility wake. */
  } finally {
    await supabase.removeChannel(channel);
  }
}
