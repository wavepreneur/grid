import { createAdminClient } from "@/lib/supabase/admin";
import type { GridContentEnvelope, GridPlayMode, TelemetrySourceType } from "@/lib/grid/telemetry-envelope";

export type WriteDomainTelemetryInput = {
  organizationId: string;
  playMode: GridPlayMode;
  metricKey: string;
  metricValue?: number | null;
  sourceType: TelemetrySourceType;
  sourceId: string;
  eventId?: string | null;
  teamId?: string | null;
  pulseSessionId?: string | null;
  pulsePlayerStateId?: string | null;
  department?: string | null;
  region?: string | null;
  country?: string | null;
  telemetryEnvelope: GridContentEnvelope | Record<string, unknown>;
};

export async function writeDomainTelemetryMetric(input: WriteDomainTelemetryInput): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("domain_telemetry_metrics").insert({
    organization_id: input.organizationId,
    play_mode: input.playMode,
    metric_key: input.metricKey,
    metric_value: input.metricValue ?? null,
    source_type: input.sourceType,
    source_id: input.sourceId,
    event_id: input.eventId ?? null,
    team_id: input.teamId ?? null,
    pulse_session_id: input.pulseSessionId ?? null,
    pulse_player_state_id: input.pulsePlayerStateId ?? null,
    department: input.department ?? null,
    region: input.region ?? null,
    country: input.country ?? null,
    telemetry_envelope: input.telemetryEnvelope,
  });
}
