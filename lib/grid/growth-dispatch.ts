import { createAdminClient } from "@/lib/supabase/admin";
import { parseGrowthPack } from "@/lib/grid/growth-pack";
import { parseTeamGameState } from "@/lib/grid/game-state";
import { buildEventPortalResultsUrl } from "@/lib/grid/codes";
import { eventRecapPath } from "@/lib/grid/event-routes";
import {
  readHrRecapEmailFromConfig,
  readHrRecapEmailFromFlags,
} from "@/lib/grid/hr-recap";
import { ensureEventPortalToken } from "@/lib/grid/portal";
import { sendStudioHrRecapEmail, studioHrMailOrigin } from "@/lib/grid/studio-hr-mail";

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
    .select("id, invite_code, booking_reference, content_config, portal_token")
    .eq("id", team.event_id)
    .maybeSingle();

  if (eventError || !event) return;

  const pack = parseGrowthPack(event.content_config);
  const { data: captures } = await supabase
    .from("event_captures")
    .select("public_url")
    .eq("team_id", team.id)
    .order("created_at", { ascending: false })
    .limit(6);
  const photoUrls = (captures ?? [])
    .map((row) => row.public_url)
    .filter((url): url is string => typeof url === "string" && url.startsWith("http"));
  const score = parseTeamGameState(team.game_state).score ?? 0;

  if (pack.enabled && pack.webhook_url) {
    const payload: FinishPayload = {
      type: "team.finished",
      booking_reference: event.booking_reference ?? null,
      invite_code: event.invite_code,
      event_id: event.id,
      team: {
        id: team.id,
        name: team.name,
        join_code: team.join_code,
        score,
        finished_at: team.finished_at,
      },
      photo_urls: photoUrls,
    };
    await postJson(pack.webhook_url, pack.capture_secret, payload);
  }

  await maybeSendHrRecap({
    supabase,
    event,
    team,
    pack,
    score,
    photoUrls,
  });
}

async function maybeSendHrRecap(input: {
  supabase: ReturnType<typeof createAdminClient>;
  event: {
    id: string;
    invite_code: string;
    content_config: unknown;
    portal_token?: string | null;
  };
  team: { id: string; name: string; join_code: string };
  pack: ReturnType<typeof parseGrowthPack>;
  score: number;
  photoUrls: string[];
}): Promise<void> {
  let hrEmail = readHrRecapEmailFromConfig(input.event.content_config);
  if (!hrEmail) {
    const cmsGameId =
      input.event.content_config &&
      typeof input.event.content_config === "object" &&
      typeof (input.event.content_config as { cms_game_id?: unknown }).cms_game_id === "string"
        ? (input.event.content_config as { cms_game_id: string }).cms_game_id
        : null;
    if (cmsGameId) {
      const { data: game } = await input.supabase
        .from("studio_games")
        .select("feature_flags")
        .eq("id", cmsGameId)
        .maybeSingle();
      hrEmail = readHrRecapEmailFromFlags(game?.feature_flags);
    }
  }
  if (!hrEmail) return;

  const origin = studioHrMailOrigin();
  const token = await ensureEventPortalToken(input.event.id, input.event.portal_token ?? null);
  const resultsUrl = buildEventPortalResultsUrl(origin, token);
  const recapUrl = `${origin}${eventRecapPath(input.event.invite_code, input.team.join_code)}`;

  if (input.pack.enabled && input.pack.capture_url) {
    const posted = await postGrowthCapture({
      captureUrl: input.pack.capture_url,
      captureSecret: input.pack.capture_secret,
      body: {
        type: "player.recap",
        booking_reference: null,
        invite_code: input.event.invite_code,
        team_id: input.team.id,
        team_name: input.team.name,
        email: hrEmail,
        score: input.score,
        photo_urls: input.photoUrls,
        results_url: resultsUrl,
      },
    });
    if (posted.ok) return;
    console.error("[growth] HR recap capture failed", posted.error);
  }

  const mailed = await sendStudioHrRecapEmail({
    to: hrEmail,
    teamName: input.team.name,
    score: input.score,
    resultsUrl,
    recapUrl,
    photoUrls: input.photoUrls,
  });
  if (!mailed.ok) {
    console.error("[growth] HR recap mail skipped", mailed.error);
  }
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
