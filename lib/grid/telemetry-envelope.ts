import type { BlueprintArchetype } from "@/lib/grid/blueprints";
import type { EventContentConfig, EventRouteOverride } from "@/lib/grid/level-types";

export const TELEMETRY_ENVELOPE_SCHEMA_VERSION = 1 as const;

export type GridPlayMode = "sync_live" | "async_pulse";

export type PulseChannel = "slack" | "msteams" | "web" | "api";

export type TelemetryPerformanceBlock = {
  stress_index?: number;
  collaboration_streak?: number;
  intelligence_score_delta?: number;
};

/** Unified JSON contract for sync_live events and async_pulse sessions. */
export type GridContentEnvelope = {
  schema_version: typeof TELEMETRY_ENVELOPE_SCHEMA_VERSION;
  play_mode: GridPlayMode;
  blueprint_slug?: string;
  archetype?: BlueprintArchetype | "PULSE_SPRINT";
  duration_minutes: number;
  channel?: PulseChannel | null;
  content_config?: EventContentConfig;
  route_override?: EventRouteOverride;
  performance?: TelemetryPerformanceBlock;
};

export type TelemetrySourceType =
  | "event"
  | "team"
  | "player"
  | "pulse_session"
  | "pulse_player"
  | "program";

export function buildContentEnvelope(input: {
  play_mode: GridPlayMode;
  duration_minutes: number;
  blueprint_slug?: string;
  archetype?: GridContentEnvelope["archetype"];
  channel?: PulseChannel | null;
  content_config?: EventContentConfig;
  route_override?: EventRouteOverride;
  performance?: TelemetryPerformanceBlock;
}): GridContentEnvelope {
  return {
    schema_version: TELEMETRY_ENVELOPE_SCHEMA_VERSION,
    play_mode: input.play_mode,
    blueprint_slug: input.blueprint_slug,
    archetype: input.archetype,
    duration_minutes: input.duration_minutes,
    channel: input.channel ?? null,
    content_config: input.content_config,
    route_override: input.route_override,
    performance: input.performance,
  };
}

/** Global Team Intelligence Score: sync stress minus async baseline streak. */
export function computeIntelligenceScoreDelta(input: {
  stress_index: number;
  collaboration_streak: number;
}): number {
  return Number((input.stress_index - input.collaboration_streak).toFixed(4));
}

export function withPerformanceEnvelope(
  envelope: GridContentEnvelope,
  performance: Omit<TelemetryPerformanceBlock, "intelligence_score_delta"> & {
    intelligence_score_delta?: number;
  },
): GridContentEnvelope {
  const intelligence_score_delta =
    performance.intelligence_score_delta ??
    (performance.stress_index !== undefined && performance.collaboration_streak !== undefined
      ? computeIntelligenceScoreDelta({
          stress_index: performance.stress_index,
          collaboration_streak: performance.collaboration_streak,
        })
      : undefined);

  return {
    ...envelope,
    performance: {
      ...performance,
      ...(intelligence_score_delta !== undefined ? { intelligence_score_delta } : {}),
    },
  };
}
