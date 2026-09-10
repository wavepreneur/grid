import { createAdminClient } from "@/lib/supabase/admin";
import { parseGrowthPack } from "@/lib/grid/growth-pack";
import { parseTeamGameState } from "@/lib/grid/game-state";

const DISPATCH_TIMEOUT_MS = 4000;

type FinishPayload = {
  type: "team.finished";
  booking_reference: string | null;
  invite_code: string;
  event_id: string;
  team: {
    id: string;
    name: string;
    join_code: string;
    score: number;
    finished_at: string | null;
  };
  photo_urls: string[];
};

async function postJson(url: string, secret: string | null, body: unknown): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function dispatchGrowthTeamFinished(teamId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, join_code, status, finished_at, game_state, event_id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError || !team || team.status !== "finished") return;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, invite_code, booking_reference, content_config")
    .eq("id", team.event_id)
    .maybeSingle();

  if (eventError || !event) return;

  const pack = parseGrowthPack(event.content_config);
  if (!pack.enabled || !pack.webhook_url) return;

  const { data: captures } = await supabase
    .from("event_captures")
    .select("public_url")
    .eq("team_id", team.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const payload: FinishPayload = {
    type: "team.finished",
    booking_reference: event.booking_reference ?? null,
    invite_code: event.invite_code,
    event_id: event.id,
    team: {
      id: team.id,
      name: team.name,
      join_code: team.join_code,
      score: parseTeamGameState(team.game_state).score ?? 0,
      finished_at: team.finished_at,
    },
    photo_urls: (captures ?? [])
      .map((row) => row.public_url)
      .filter((url): url is string => typeof url === "string" && url.startsWith("http")),
  };

  await postJson(pack.webhook_url, pack.capture_secret, payload);
}

/** Fire-and-forget after a successful finish write. Never throw into play. */
export function queueGrowthTeamFinished(teamId: string): void {
  void dispatchGrowthTeamFinished(teamId).catch((error) => {
    console.error("[growth] team.finished dispatch failed", error);
  });
}

export async function postGrowthCapture(input: {
  captureUrl: string;
  captureSecret: string | null;
  body: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);
  try {
    const response = await fetch(input.captureUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.captureSecret ? { Authorization: `Bearer ${input.captureSecret}` } : {}),
      },
      body: JSON.stringify(input.body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, error: text.slice(0, 200) || `Capture failed (${response.status})` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Capture unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}
