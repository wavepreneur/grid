import { createAdminClient } from "@/lib/supabase/admin";

export type AuditLogInput = {
  organizationId: string;
  action: string;
  eventId?: string | null;
  teamId?: string | null;
  playerId?: string | null;
  payload?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    event_id: input.eventId ?? null,
    team_id: input.teamId ?? null,
    player_id: input.playerId ?? null,
    action: input.action,
    payload: input.payload ?? {},
  });
}
