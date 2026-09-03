import { createAdminClient } from "@/lib/supabase/admin";
import { generateAccessCode, generateInviteCode, generateJoinCode, normalizeCode } from "@/lib/grid/codes";
import { getCityIdBySlug } from "@/lib/grid/organizations";
import { parseRuntimeProfiles } from "@/lib/cms/layer-model";
import type { StudioGame } from "@/lib/cms/types";
import { MAX_PLAYERS_PER_TEAM } from "@/lib/grid/team-seats";

export { MAX_PLAYERS_PER_TEAM, splitTeamSeats, formatTeamSeatPreview } from "@/lib/grid/team-seats";

export type AccessKind = "team" | "event_pool";
export type AccessStatus = "unused" | "redeemed" | "expired" | "revoked";

export type AccessCodeRow = {
  id: string;
  batch_id: string;
  organization_id: string;
  code: string;
  kind: AccessKind;
  status: AccessStatus;
  event_id: string | null;
  team_id: string | null;
  redeemed_at: string | null;
  last_joined_at: string | null;
  revoked_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
};

export type AccessBatchRow = {
  id: string;
  organization_id: string;
  game_id: string | null;
  game_version_id: string | null;
  event_id: string | null;
  name: string;
  kind: AccessKind;
  max_activations: number | null;
  used_activations: number;
  players_per_team: number;
  valid_from: string | null;
  valid_until: string | null;
  booking_reference: string | null;
  created_at: string;
  updated_at: string;
};

export type ResolvedAccess = {
  code: string;
  kind: AccessKind;
  inviteCode: string;
  joinCode: string | null;
  eventId: string;
  teamId: string | null;
  eventTitle: string;
  teamName: string | null;
  path: string;
};

const GENERIC_MISS = "Diesen Code gibt es hier nicht.";

export function effectiveAccessStatus(row: {
  status: AccessStatus;
  valid_from: string | null;
  valid_until: string | null;
  now?: Date;
}): AccessStatus {
  if (row.status === "revoked") return "revoked";
  const now = row.now ?? new Date();
  if (row.valid_from && new Date(row.valid_from).getTime() > now.getTime()) {
    return "expired";
  }
  if (row.valid_until && new Date(row.valid_until).getTime() < now.getTime()) {
    return "expired";
  }
  return row.status;
}

export async function allocateUniqueAccessCode(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateAccessCode(6);
    const [{ data: access }, { data: team }, { data: event }] = await Promise.all([
      supabase.from("studio_access_codes").select("id").eq("code", code).maybeSingle(),
      supabase.from("teams").select("id").eq("join_code", code).maybeSingle(),
      supabase.from("events").select("id").eq("invite_code", code).maybeSingle(),
    ]);
    if (!access && !team && !event) return code;
  }
  throw new Error("Kein freier Zugangscode gefunden. Bitte erneut versuchen.");
}

export async function lookupAccessCode(rawCode: string): Promise<
  | { ok: true; data: ResolvedAccess }
  | { ok: false; error: string }
> {
  const code = normalizeCode(rawCode);
  if (code.length < 4 || code.length > 10) {
    return { ok: false, error: GENERIC_MISS };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("studio_access_codes")
    .select(
      "id, batch_id, code, kind, status, event_id, team_id, valid_from, valid_until, revoked_at",
    )
    .eq("code", code)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: GENERIC_MISS };

  const status = effectiveAccessStatus({
    status: data.status as AccessStatus,
    valid_from: data.valid_from,
    valid_until: data.valid_until,
  });

  if (status === "revoked") {
    return { ok: false, error: "Dieser Code wurde gelöscht." };
  }
  if (status === "expired") {
    if (data.status !== "expired") {
      await supabase
        .from("studio_access_codes")
        .update({ status: "expired" })
        .eq("id", data.id)
        .eq("status", data.status);
    }
    return { ok: false, error: "Dieser Code ist abgelaufen." };
  }

  if (!data.event_id) {
    return { ok: false, error: GENERIC_MISS };
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, invite_code, title, status")
    .eq("id", data.event_id)
    .maybeSingle();

  if (!event) return { ok: false, error: GENERIC_MISS };
  if (event.status === "completed" || event.status === "archived") {
    return { ok: false, error: "Dieses Spiel ist beendet." };
  }

  if (data.kind === "event_pool") {
    return {
      ok: true,
      data: {
        code: data.code,
        kind: "event_pool",
        inviteCode: event.invite_code,
        joinCode: null,
        eventId: event.id,
        teamId: null,
        eventTitle: event.title,
        teamName: null,
        path: `/e/${event.invite_code}`,
      },
    };
  }

  if (!data.team_id) return { ok: false, error: GENERIC_MISS };

  const { data: team } = await supabase
    .from("teams")
    .select("id, join_code, name, status")
    .eq("id", data.team_id)
    .maybeSingle();

  if (!team || team.status === "disbanded") {
    return { ok: false, error: GENERIC_MISS };
  }

  return {
    ok: true,
    data: {
      code: data.code,
      kind: "team",
      inviteCode: event.invite_code,
      joinCode: team.join_code,
      eventId: event.id,
      teamId: team.id,
      eventTitle: event.title,
      teamName: team.name,
      path: `/e/${event.invite_code}/team/${team.join_code}`,
    },
  };
}

export async function touchAccessOnJoin(input: {
  teamId: string;
  eventId: string;
  isNewPlayer: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: teamCode } = await supabase
    .from("studio_access_codes")
    .select("id, status")
    .eq("team_id", input.teamId)
    .neq("status", "revoked")
    .maybeSingle();

  if (teamCode) {
    const patch: Record<string, unknown> = { last_joined_at: now };
    if (teamCode.status === "unused") {
      patch.status = "redeemed";
      patch.redeemed_at = now;
    }
    await supabase.from("studio_access_codes").update(patch).eq("id", teamCode.id);
  }

  const { data: event } = await supabase
    .from("events")
    .select("access_batch_id")
    .eq("id", input.eventId)
    .maybeSingle();

  const batchId = event?.access_batch_id as string | null;
  if (!batchId || !input.isNewPlayer) return { ok: true };

  const { data: batch } = await supabase
    .from("studio_access_batches")
    .select("id, kind, max_activations, used_activations")
    .eq("id", batchId)
    .maybeSingle();

  if (!batch || batch.kind !== "event_pool") return { ok: true };

  const max = batch.max_activations != null ? Number(batch.max_activations) : null;
  const used = Number(batch.used_activations ?? 0);
  if (max != null && used >= max) {
    return { ok: false, error: "Alle Zugänge für dieses Event sind belegt." };
  }

  const { error } = await supabase
    .from("studio_access_batches")
    .update({
      used_activations: used + 1,
      updated_at: now,
    })
    .eq("id", batch.id)
    .eq("used_activations", used);

  if (error) return { ok: false, error: error.message };

  await supabase
    .from("studio_access_codes")
    .update({
      status: "redeemed",
      redeemed_at: now,
      last_joined_at: now,
    })
    .eq("batch_id", batch.id)
    .eq("kind", "event_pool")
    .in("status", ["unused", "redeemed"]);

  return { ok: true };
}

export async function assertEventPoolHasSeat(eventId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("access_batch_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event?.access_batch_id) return null;

  const { data: batch } = await supabase
    .from("studio_access_batches")
    .select("kind, max_activations, used_activations")
    .eq("id", event.access_batch_id)
    .maybeSingle();

  if (!batch || batch.kind !== "event_pool") return null;
  const max = batch.max_activations != null ? Number(batch.max_activations) : null;
  const used = Number(batch.used_activations ?? 0);
  if (max != null && used >= max) {
    return "Alle Zugänge für dieses Event sind belegt.";
  }
  return null;
}

type ProvisionTeam = { id: string; join_code: string; name: string };

export async function insertAccessCodesForTeams(input: {
  organizationId: string;
  batchId: string;
  eventId: string;
  kind: AccessKind;
  teams: ProvisionTeam[];
  validFrom: string | null;
  validUntil: string | null;
}): Promise<Array<{ teamId: string; code: string }>> {
  const supabase = createAdminClient();
  const issued: Array<{ teamId: string; code: string }> = [];

  for (const team of input.teams) {
    const code = await allocateUniqueAccessCode(supabase);
    const { error } = await supabase.from("studio_access_codes").insert({
      batch_id: input.batchId,
      organization_id: input.organizationId,
      code,
      kind: "team",
      status: "unused",
      event_id: input.eventId,
      team_id: team.id,
      valid_from: input.validFrom,
      valid_until: input.validUntil,
    });
    if (error) throw new Error(error.message);
    issued.push({ teamId: team.id, code });
  }

  return issued;
}

export async function ensureTeamAccessCodesForEvent(input: {
  organizationId: string;
  eventId: string;
  eventTitle: string;
  bookingReference?: string | null;
}): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("studio_access_codes")
    .select("team_id, code")
    .eq("event_id", input.eventId)
    .eq("kind", "team")
    .not("team_id", "is", null);

  const map = new Map<string, string>();
  for (const row of existing ?? []) {
    if (row.team_id) map.set(row.team_id as string, row.code as string);
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, join_code, name")
    .eq("event_id", input.eventId)
    .order("join_code", { ascending: true });

  if (teamsError) throw new Error(teamsError.message);
  const missing = (teams ?? []).filter((team) => !map.has(team.id));
  if (missing.length === 0) return map;

  let batchId: string | null = null;
  const { data: event } = await supabase
    .from("events")
    .select("access_batch_id")
    .eq("id", input.eventId)
    .maybeSingle();
  batchId = (event?.access_batch_id as string | null) ?? null;

    if (!batchId) {
      const { data: batch, error: batchError } = await supabase
        .from("studio_access_batches")
        .insert({
          organization_id: input.organizationId,
          event_id: input.eventId,
          name: input.eventTitle,
          kind: "team",
          players_per_team: MAX_PLAYERS_PER_TEAM,
          booking_reference: input.bookingReference ?? null,
        })
        .select("id")
        .single();
      if (batchError || !batch) throw new Error(batchError?.message ?? "Access-Batch fehlgeschlagen.");
      batchId = batch.id as string;
      await supabase.from("events").update({ access_batch_id: batchId }).eq("id", input.eventId);
    }

    if (!batchId) throw new Error("Access-Batch fehlt.");

    const issued = await insertAccessCodesForTeams({
      organizationId: input.organizationId,
      batchId,
      eventId: input.eventId,
      kind: "team",
      teams: missing as ProvisionTeam[],
      validFrom: null,
      validUntil: null,
    });
  for (const row of issued) map.set(row.teamId, row.code);
  return map;
}

export type CreateAccessBatchInput = {
  organizationId: string;
  name: string;
  kind: AccessKind;
  game: StudioGame;
  versionId: string;
  teamSeats: number[];
  maxActivations: number | null;
  validFrom: string | null;
  validUntil: string | null;
  bookingReference?: string | null;
};

export async function provisionStudioAccessBatch(
  input: CreateAccessBatchInput,
): Promise<{ batchId: string; eventId: string; codes: string[] }> {
  const supabase = createAdminClient();
  const game = input.game;
  const profiles = parseRuntimeProfiles(game.runtime_profiles);
  const teamSeats = input.kind === "team" ? input.teamSeats : [];
  if (input.kind === "team") {
    if (teamSeats.length < 1) {
      throw new Error("Es braucht mindestens ein Team.");
    }
    if (teamSeats.some((seats) => seats < 1 || seats > MAX_PLAYERS_PER_TEAM)) {
      throw new Error(`Jedes Team braucht 1–${MAX_PLAYERS_PER_TEAM} Plätze.`);
    }
  }
  const playersPerTeam =
    teamSeats.length > 0 ? Math.max(...teamSeats) : MAX_PLAYERS_PER_TEAM;

  let cityId: string | null = null;
  if (game.gps_enabled && game.city_slug) {
    cityId = await getCityIdBySlug(input.organizationId, game.city_slug);
  }

  const { data: batch, error: batchError } = await supabase
    .from("studio_access_batches")
    .insert({
      organization_id: input.organizationId,
      game_id: game.id,
      game_version_id: input.versionId,
      name: input.name.trim(),
      kind: input.kind,
      max_activations: input.kind === "event_pool" ? input.maxActivations : null,
      used_activations: 0,
      players_per_team: playersPerTeam,
      valid_from: input.validFrom,
      valid_until: input.validUntil,
      booking_reference: input.bookingReference ?? null,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    throw new Error(batchError?.message ?? "Ticket-Satz konnte nicht angelegt werden.");
  }

  const inviteCode = generateInviteCode();
  const maxTeams =
    input.kind === "event_pool"
      ? Math.max(1, input.maxActivations ?? 500)
      : Math.max(1, teamSeats.length);

  const contentConfig = {
    blueprint_slug: game.gps_enabled ? "exitmania" : "tabbrain",
    city_slug: game.city_slug ?? undefined,
    cms_game_id: game.id,
    cms_version_number: game.published_version_number,
    mission_duration_minutes: game.duration_minutes ?? 90,
    show_live_score: true,
    content_mode: profiles.default_mode,
    runtime_profiles: game.runtime_profiles,
    allowed_fallbacks: profiles.allowed_fallbacks,
  };

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      title: input.name.trim(),
      organization_id: input.organizationId,
      city_id: cityId,
      invite_code: inviteCode,
      status: "lobby",
      max_teams: maxTeams,
      max_players_per_team: playersPerTeam,
      booking_reference: input.bookingReference ?? null,
      content_config: contentConfig,
      studio_game_version_id: input.versionId,
    })
    .select("id, invite_code")
    .single();

  if (eventError || !event) {
    await supabase.from("studio_access_batches").delete().eq("id", batch.id);
    throw new Error(eventError?.message ?? "Event konnte nicht erstellt werden.");
  }

  const { error: linkError } = await supabase
    .from("events")
    .update({ access_batch_id: batch.id })
    .eq("id", event.id);
  if (linkError) {
    await supabase.from("events").delete().eq("id", event.id);
    await supabase.from("studio_access_batches").delete().eq("id", batch.id);
    throw new Error(linkError.message);
  }

  await supabase
    .from("studio_access_batches")
    .update({ event_id: event.id, updated_at: new Date().toISOString() })
    .eq("id", batch.id);

  const codes: string[] = [];

  if (input.kind === "event_pool") {
    const code = await allocateUniqueAccessCode(supabase);
    const { error: codeError } = await supabase.from("studio_access_codes").insert({
      batch_id: batch.id,
      organization_id: input.organizationId,
      code,
      kind: "event_pool",
      status: "unused",
      event_id: event.id,
      valid_from: input.validFrom,
      valid_until: input.validUntil,
    });
    if (codeError) throw new Error(codeError.message);
    codes.push(code);
    return { batchId: batch.id, eventId: event.id, codes };
  }

  const teams: ProvisionTeam[] = [];
  for (let i = 0; i < teamSeats.length; i++) {
    const joinCode = generateJoinCode();
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        event_id: event.id,
        organization_id: input.organizationId,
        join_code: joinCode,
        name: `Team ${i + 1}`,
        max_size: teamSeats[i],
        status: "setup",
      })
      .select("id, join_code, name")
      .single();
    if (teamError || !team) {
      throw new Error(teamError?.message ?? "Team konnte nicht erstellt werden.");
    }
    teams.push(team as ProvisionTeam);
  }

  const issued = await insertAccessCodesForTeams({
    organizationId: input.organizationId,
    batchId: batch.id,
    eventId: event.id,
    kind: "team",
    teams,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
  });
  codes.push(...issued.map((row) => row.code));
  return { batchId: batch.id, eventId: event.id, codes };
}

export async function appendTeamAccessCodes(input: {
  organizationId: string;
  batchId: string;
  quantity: number;
}): Promise<string[]> {
  const supabase = createAdminClient();
  const { data: batch, error } = await supabase
    .from("studio_access_batches")
    .select("*")
    .eq("id", input.batchId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!batch) throw new Error("Ticket-Satz nicht gefunden.");
  if (batch.kind !== "team") {
    throw new Error("Weitere Codes gibt es nur bei Team-Zugängen.");
  }
  if (!batch.event_id) throw new Error("Dieser Satz hat kein Event.");

  const { data: event } = await supabase
    .from("events")
    .select("id, max_teams")
    .eq("id", batch.event_id)
    .maybeSingle();
  if (!event) throw new Error("Event nicht gefunden.");

  const { count } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  const existing = count ?? 0;
  const nextMax = existing + input.quantity;
  await supabase
    .from("events")
    .update({ max_teams: Math.max(event.max_teams ?? nextMax, nextMax) })
    .eq("id", event.id);

  const teams: ProvisionTeam[] = [];
  for (let i = 0; i < input.quantity; i++) {
    const joinCode = generateJoinCode();
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        event_id: event.id,
        organization_id: input.organizationId,
        join_code: joinCode,
        name: `Team ${existing + i + 1}`,
        max_size: batch.players_per_team,
        status: "setup",
      })
      .select("id, join_code, name")
      .single();
    if (teamError || !team) throw new Error(teamError?.message ?? "Team fehlgeschlagen.");
    teams.push(team as ProvisionTeam);
  }

  const issued = await insertAccessCodesForTeams({
    organizationId: input.organizationId,
    batchId: batch.id,
    eventId: event.id,
    kind: "team",
    teams,
    validFrom: batch.valid_from,
    validUntil: batch.valid_until,
  });
  return issued.map((row) => row.code);
}
