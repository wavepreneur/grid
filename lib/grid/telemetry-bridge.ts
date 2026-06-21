import { createAdminClient } from "@/lib/supabase/admin";
import { writeDomainTelemetryMetric } from "@/lib/grid/domain-telemetry";
import { DEFAULT_STARTING_SCORE } from "@/lib/grid/level-types";
import {
  buildContentEnvelope,
  computeIntelligenceScoreDelta,
  type GridContentEnvelope,
} from "@/lib/grid/telemetry-envelope";
import type { AuditLogInput } from "@/lib/grid/audit-log";

const SYNC_TELEMETRY_ACTIONS = new Set(["level_completed", "game_finished"]);

const PULSE_STREAK_TARGET = 12;

type TeamContext = {
  department: string | null;
  region: string | null;
  country: string | null;
};

type EventContext = {
  content_config: unknown;
  route_override: unknown;
  play_mode: string | null;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

export function computeStressIndex(score: number): number {
  return clamp01(score / DEFAULT_STARTING_SCORE);
}

export function computeCollaborationStreak(streakCount: number): number {
  return clamp01(streakCount / PULSE_STREAK_TARGET);
}

async function loadTeamContext(teamId: string): Promise<TeamContext | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("teams")
    .select("department, region, country")
    .eq("id", teamId)
    .maybeSingle();

  return data ?? null;
}

async function loadEventContext(eventId: string): Promise<EventContext | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("events")
    .select("content_config, route_override, play_mode")
    .eq("id", eventId)
    .maybeSingle();

  return data ?? null;
}

function resolveBlueprintSlug(contentConfig: unknown): string | undefined {
  if (!contentConfig || typeof contentConfig !== "object") return undefined;
  const slug = (contentConfig as { blueprint_slug?: unknown }).blueprint_slug;
  return typeof slug === "string" ? slug : undefined;
}

function buildSyncEnvelope(
  event: EventContext | null,
  performance: GridContentEnvelope["performance"],
): GridContentEnvelope {
  return buildContentEnvelope({
    play_mode: "sync_live",
    duration_minutes: 90,
    blueprint_slug: event ? resolveBlueprintSlug(event.content_config) : undefined,
    archetype: "ASYMMETRIC_INFORMANT",
    channel: null,
    content_config:
      event?.content_config && typeof event.content_config === "object"
        ? (event.content_config as GridContentEnvelope["content_config"])
        : undefined,
    route_override:
      event?.route_override && typeof event.route_override === "object"
        ? (event.route_override as GridContentEnvelope["route_override"])
        : undefined,
    performance,
  });
}

/** Mirrors selected audit_logs actions into domain_telemetry_metrics. */
export async function mirrorAuditToDomainTelemetry(input: AuditLogInput): Promise<void> {
  if (!SYNC_TELEMETRY_ACTIONS.has(input.action)) {
    return;
  }

  const score = typeof input.payload?.score === "number" ? input.payload.score : null;
  if (score === null || !input.eventId) {
    return;
  }

  const [team, event] = await Promise.all([
    input.teamId ? loadTeamContext(input.teamId) : Promise.resolve(null),
    loadEventContext(input.eventId),
  ]);

  const stressIndex = computeStressIndex(score);
  const envelope = buildSyncEnvelope(event, { stress_index: stressIndex });

  const sourceId = input.teamId ?? input.eventId;
  const metricKey = input.action === "game_finished" ? "game_finished_stress_index" : "level_stress_index";

  await writeDomainTelemetryMetric({
    organizationId: input.organizationId,
    playMode: "sync_live",
    metricKey,
    metricValue: stressIndex,
    sourceType: input.teamId ? "team" : "event",
    sourceId,
    eventId: input.eventId,
    teamId: input.teamId ?? null,
    department: team?.department ?? null,
    region: team?.region ?? null,
    country: team?.country ?? null,
    telemetryEnvelope: envelope,
  });
}

export async function writePulsePlayerTelemetry(input: {
  organizationId: string;
  pulseSessionId: string;
  pulsePlayerStateId: string;
  department?: string | null;
  region?: string | null;
  country?: string | null;
  streakCount: number;
  score: number;
  channel: string;
  durationMinutes: number;
  contentEnvelope: Record<string, unknown>;
}): Promise<void> {
  const collaborationStreak = computeCollaborationStreak(input.streakCount);
  const baseEnvelope = buildContentEnvelope({
    play_mode: "async_pulse",
    duration_minutes: input.durationMinutes,
    blueprint_slug: "pulse",
    archetype: "PULSE_SPRINT",
    channel:
      input.channel === "slack" ||
      input.channel === "msteams" ||
      input.channel === "web" ||
      input.channel === "api"
        ? input.channel
        : "web",
    performance: {
      collaboration_streak: collaborationStreak,
    },
  });

  await writeDomainTelemetryMetric({
    organizationId: input.organizationId,
    playMode: "async_pulse",
    metricKey: "pulse_collaboration_streak",
    metricValue: collaborationStreak,
    sourceType: "pulse_player",
    sourceId: input.pulsePlayerStateId,
    pulseSessionId: input.pulseSessionId,
    pulsePlayerStateId: input.pulsePlayerStateId,
    department: input.department ?? null,
    region: input.region ?? null,
    country: input.country ?? null,
    telemetryEnvelope: {
      ...baseEnvelope,
      ...(Object.keys(input.contentEnvelope).length > 0 ? input.contentEnvelope : {}),
    },
  });
}

export function computeOrgIntelligenceDelta(input: {
  avgStressIndex: number;
  avgCollaborationStreak: number;
}): number {
  return computeIntelligenceScoreDelta({
    stress_index: input.avgStressIndex,
    collaboration_streak: input.avgCollaborationStreak,
  });
}
