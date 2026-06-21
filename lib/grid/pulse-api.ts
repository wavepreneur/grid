import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/grid/audit-log";
import { generatePulseCode } from "@/lib/grid/codes";
import { getOrganizationBySlug } from "@/lib/grid/organizations";
import { writePulsePlayerTelemetry } from "@/lib/grid/telemetry-bridge";
import { buildContentEnvelope } from "@/lib/grid/telemetry-envelope";
import type { PulseChannel } from "@/lib/grid/telemetry-envelope";

export type PulseSessionCreateRequest = {
  organization_slug?: string;
  program_slug?: string;
  title: string;
  channel?: PulseChannel;
  duration_minutes?: number;
  booking_reference?: string;
  content_envelope?: Record<string, unknown>;
  scheduled_at?: string;
  external_workspace_id?: string;
  external_channel_id?: string;
  external_thread_id?: string;
};

export type PulseProgressRequest = {
  player_ref: string;
  display_name?: string;
  department?: string;
  region?: string;
  country?: string;
  progress_state?: Record<string, unknown>;
  metrics_snapshot?: Record<string, unknown>;
  score?: number;
  streak_count?: number;
  complete_session?: boolean;
};

export type PulseSessionResponse = {
  pulse_session_id: string;
  pulse_code: string;
  title: string;
  status: string;
  channel: string;
  duration_minutes: number;
  play_mode: "async_pulse";
  progress_url: string;
  status_url: string;
  booking_reference: string | null;
  idempotent?: boolean;
};

export type PulsePlayerStateSnapshot = {
  player_ref: string;
  display_name: string | null;
  department: string | null;
  region: string | null;
  score: number;
  streak_count: number;
  last_pulse_at: string;
  progress_state: Record<string, unknown>;
};

export type PulseSessionStatusResponse = {
  pulse_session_id: string;
  pulse_code: string;
  title: string;
  status: string;
  channel: string;
  duration_minutes: number;
  started_at: string | null;
  completed_at: string | null;
  player_count: number;
  players: PulsePlayerStateSnapshot[];
};

type PulseSessionRow = {
  id: string;
  organization_id: string;
  pulse_code: string;
  title: string;
  status: string;
  channel: string;
  duration_minutes: number;
  content_envelope: unknown;
  booking_reference: string | null;
  started_at: string | null;
  completed_at: string | null;
};

function normalizePulseCode(value: string): string {
  return value.trim().toUpperCase();
}

function defaultContentEnvelope(
  channel: PulseChannel,
  durationMinutes: number,
): Record<string, unknown> {
  return buildContentEnvelope({
    play_mode: "async_pulse",
    duration_minutes: durationMinutes,
    blueprint_slug: "pulse",
    archetype: "PULSE_SPRINT",
    channel,
  });
}

export function validatePulseSessionRequest(body: PulseSessionCreateRequest): string | null {
  const title = body.title?.trim();
  if (!title || title.length < 3) {
    return "title must be at least 3 characters";
  }
  const duration = body.duration_minutes ?? 10;
  if (!Number.isInteger(duration) || duration < 5 || duration > 30) {
    return "duration_minutes must be between 5 and 30";
  }
  return null;
}

export function validatePulseProgressRequest(body: PulseProgressRequest): string | null {
  const playerRef = body.player_ref?.trim();
  if (!playerRef || playerRef.length < 2) {
    return "player_ref must be at least 2 characters";
  }
  if (body.score !== undefined && (typeof body.score !== "number" || body.score < 0)) {
    return "score must be a non-negative number";
  }
  if (
    body.streak_count !== undefined &&
    (!Number.isInteger(body.streak_count) || body.streak_count < 0)
  ) {
    return "streak_count must be a non-negative integer";
  }
  return null;
}

async function resolveProgramId(
  organizationId: string,
  programSlug?: string,
): Promise<string | null> {
  if (!programSlug?.trim()) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pulse_programs")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", programSlug.trim())
    .maybeSingle();

  return data?.id ?? null;
}

async function findPulseSessionByBookingReference(
  organizationId: string,
  bookingReference: string,
): Promise<PulseSessionRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pulse_sessions")
    .select(
      "id, organization_id, pulse_code, title, status, channel, duration_minutes, content_envelope, booking_reference, started_at, completed_at",
    )
    .eq("organization_id", organizationId)
    .eq("booking_reference", bookingReference.trim())
    .maybeSingle();

  return data ?? null;
}

async function findPulseSessionByCode(pulseCode: string): Promise<PulseSessionRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pulse_sessions")
    .select(
      "id, organization_id, pulse_code, title, status, channel, duration_minutes, content_envelope, booking_reference, started_at, completed_at",
    )
    .eq("pulse_code", normalizePulseCode(pulseCode))
    .maybeSingle();

  return data ?? null;
}

export function buildPulseSessionUrls(origin: string, pulseCode: string) {
  const base = origin.replace(/\/$/, "");
  const code = normalizePulseCode(pulseCode);
  return {
    progress_url: `${base}/api/v1/pulse/sessions/${code}/progress`,
    status_url: `${base}/api/v1/pulse/sessions/${code}/status`,
  };
}

function toSessionResponse(
  session: PulseSessionRow,
  origin: string,
  idempotent = false,
): PulseSessionResponse {
  const urls = buildPulseSessionUrls(origin, session.pulse_code);
  return {
    pulse_session_id: session.id,
    pulse_code: session.pulse_code,
    title: session.title,
    status: session.status,
    channel: session.channel,
    duration_minutes: session.duration_minutes,
    play_mode: "async_pulse",
    progress_url: urls.progress_url,
    status_url: urls.status_url,
    booking_reference: session.booking_reference,
    ...(idempotent ? { idempotent: true } : {}),
  };
}

export async function createPulseSession(
  body: PulseSessionCreateRequest,
  origin: string,
): Promise<PulseSessionResponse> {
  const orgSlug = body.organization_slug ?? "tabbrain";
  const organization = await getOrganizationBySlug(orgSlug);
  if (!organization) {
    throw new Error(`Organization "${orgSlug}" not found`);
  }

  if (body.booking_reference?.trim()) {
    const existing = await findPulseSessionByBookingReference(
      organization.id,
      body.booking_reference,
    );
    if (existing) {
      return toSessionResponse(existing, origin, true);
    }
  }

  const channel = body.channel ?? "web";
  const durationMinutes = body.duration_minutes ?? 10;
  const programId = await resolveProgramId(organization.id, body.program_slug);
  const contentEnvelope = {
    ...defaultContentEnvelope(channel, durationMinutes),
    ...(body.content_envelope ?? {}),
  };

  const supabase = createAdminClient();
  const pulseCode = generatePulseCode();

  const { data: session, error } = await supabase
    .from("pulse_sessions")
    .insert({
      organization_id: organization.id,
      program_id: programId,
      pulse_code: pulseCode,
      title: body.title.trim(),
      status: "draft",
      play_mode: "async_pulse",
      channel,
      duration_minutes: durationMinutes,
      content_envelope: contentEnvelope,
      booking_reference: body.booking_reference?.trim() ?? null,
      scheduled_at: body.scheduled_at ?? null,
      external_workspace_id: body.external_workspace_id ?? null,
      external_channel_id: body.external_channel_id ?? null,
      external_thread_id: body.external_thread_id ?? null,
    })
    .select(
      "id, organization_id, pulse_code, title, status, channel, duration_minutes, content_envelope, booking_reference, started_at, completed_at",
    )
    .single();

  if (error || !session) {
    throw new Error(error?.message ?? "Failed to create pulse session");
  }

  await writeAuditLog({
    organizationId: organization.id,
    action: "pulse_session_created",
    payload: {
      pulse_session_id: session.id,
      pulse_code: session.pulse_code,
      channel,
      duration_minutes: durationMinutes,
      booking_reference: body.booking_reference ?? null,
    },
  });

  return toSessionResponse(session, origin);
}

export async function getPulseSessionStatus(pulseCode: string): Promise<PulseSessionStatusResponse> {
  const session = await findPulseSessionByCode(pulseCode);
  if (!session) {
    throw new Error("Pulse session not found");
  }

  const supabase = createAdminClient();
  const { data: players, error } = await supabase
    .from("pulse_player_states")
    .select(
      "player_ref, display_name, department, region, score, streak_count, last_pulse_at, progress_state",
    )
    .eq("pulse_session_id", session.id)
    .order("last_pulse_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    pulse_session_id: session.id,
    pulse_code: session.pulse_code,
    title: session.title,
    status: session.status,
    channel: session.channel,
    duration_minutes: session.duration_minutes,
    started_at: session.started_at,
    completed_at: session.completed_at,
    player_count: players?.length ?? 0,
    players: (players ?? []).map((player) => ({
      player_ref: player.player_ref,
      display_name: player.display_name,
      department: player.department,
      region: player.region,
      score: Number(player.score),
      streak_count: player.streak_count,
      last_pulse_at: player.last_pulse_at,
      progress_state: (player.progress_state as Record<string, unknown>) ?? {},
    })),
  };
}

export async function upsertPulsePlayerProgress(
  pulseCode: string,
  body: PulseProgressRequest,
): Promise<{ player_state_id: string; session_status: string }> {
  const session = await findPulseSessionByCode(pulseCode);
  if (!session) {
    throw new Error("Pulse session not found");
  }

  if (session.status === "completed" || session.status === "cancelled") {
    throw new Error(`Pulse session is ${session.status}`);
  }

  const supabase = createAdminClient();
  const playerRef = body.player_ref.trim();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("pulse_player_states")
    .select("id, streak_count, score")
    .eq("pulse_session_id", session.id)
    .eq("player_ref", playerRef)
    .maybeSingle();

  const streakCount = body.streak_count ?? existing?.streak_count ?? 0;
  const score = body.score ?? existing?.score ?? 0;

  const upsertPayload = {
    pulse_session_id: session.id,
    player_ref: playerRef,
    display_name: body.display_name?.trim() ?? null,
    department: body.department?.trim() ?? null,
    region: body.region?.trim() ?? null,
    country: body.country?.trim() ?? null,
    progress_state: body.progress_state ?? {},
    metrics_snapshot: body.metrics_snapshot ?? {},
    score,
    streak_count: streakCount,
    last_pulse_at: now,
  };

  const { data: playerState, error: upsertError } = await supabase
    .from("pulse_player_states")
    .upsert(upsertPayload, { onConflict: "pulse_session_id,player_ref" })
    .select("id")
    .single();

  if (upsertError || !playerState) {
    throw new Error(upsertError?.message ?? "Failed to save pulse progress");
  }

  const sessionUpdate: Record<string, unknown> = { updated_at: now };
  if (session.status === "draft") {
    sessionUpdate.status = "active";
    sessionUpdate.started_at = now;
  }
  if (body.complete_session) {
    sessionUpdate.status = "completed";
    sessionUpdate.completed_at = now;
  }

  await supabase.from("pulse_sessions").update(sessionUpdate).eq("id", session.id);

  await writeAuditLog({
    organizationId: session.organization_id,
    action: "pulse_progress_logged",
    payload: {
      pulse_session_id: session.id,
      pulse_code: session.pulse_code,
      player_ref: playerRef,
      score,
      streak_count: streakCount,
      complete_session: body.complete_session ?? false,
    },
  });

  const contentEnvelope =
    session.content_envelope && typeof session.content_envelope === "object"
      ? (session.content_envelope as Record<string, unknown>)
      : {};

  await writePulsePlayerTelemetry({
    organizationId: session.organization_id,
    pulseSessionId: session.id,
    pulsePlayerStateId: playerState.id,
    department: body.department ?? null,
    region: body.region ?? null,
    country: body.country ?? null,
    streakCount,
    score,
    channel: session.channel,
    durationMinutes: session.duration_minutes,
    contentEnvelope,
  });

  const nextStatus =
    typeof sessionUpdate.status === "string" ? sessionUpdate.status : session.status;

  return {
    player_state_id: playerState.id,
    session_status: nextStatus,
  };
}
