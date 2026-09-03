import { createAdminClient } from "@/lib/supabase/admin";
import { buildDefaultContentConfig, getBlueprint, type BlueprintSlug } from "@/lib/grid/blueprints";
import { parseRouteOverride } from "@/lib/grid/content-engine";
import type { EventRouteOverride } from "@/lib/grid/level-types";
import { DEFAULT_CITY_SLUG } from "@/lib/grid/level-types";
import { ensureTeamAccessCodesForEvent } from "@/lib/grid/access";
import { buildEventPortalUrl, generatePortalToken } from "@/lib/grid/codes";
import { ensureEventPortalToken } from "@/lib/grid/portal";
import { MAX_PLAYERS_PER_TEAM } from "@/lib/grid/team-seats";

export type GridBookingRequest = {
  organization_slug?: string;
  blueprint_slug?: BlueprintSlug;
  title: string;
  team_count: number;
  players_per_team?: number;
  city_slug?: string;
  content_pack_slug?: string;
  booking_reference?: string;
  scheduled_start_at?: string;
  route_override?: EventRouteOverride;
};

export type GridBookingTeam = {
  join_code: string;
  team_name: string;
  play_url: string;
  lobby_url: string;
  access_code: string | null;
};

export type GridBookingResponse = {
  event_id: string;
  invite_code: string;
  blueprint_slug: BlueprintSlug;
  content_pack_slug: string | null;
  booking_reference: string | null;
  join_url: string;
  entry_url: string;
  cockpit_url: string;
  show_url: string;
  event_portal_url: string;
  teams: GridBookingTeam[];
  idempotent?: boolean;
};

export type GridEventTeamStatus = {
  team_id: string;
  join_code: string;
  team_name: string;
  status: string;
  current_level: number;
  score: number;
  active_player_count: number;
  started_at: string | null;
  finished_at: string | null;
};

export type GridEventStatusResponse = {
  event_id: string;
  invite_code: string;
  title: string;
  status: string;
  booking_reference: string | null;
  teams: GridEventTeamStatus[];
};

type EventRow = {
  id: string;
  invite_code: string;
  title: string;
  status: string;
  organization_id: string;
  city_id: string | null;
  booking_reference: string | null;
  content_config: unknown;
  route_override: unknown;
  max_players_per_team: number;
  portal_token: string | null;
};

type TeamRow = {
  id: string;
  join_code: string;
  name: string;
  status: string;
  current_level: number | null;
  game_state: unknown;
  started_at: string | null;
  finished_at: string | null;
};

export function resolveBookingBlueprint(
  orgSlug: string,
  requested?: string,
): BlueprintSlug {
  if (requested === "exitmania" || requested === "tabbrain") return requested;
  if (orgSlug === "tabbrain") return "tabbrain";
  return "exitmania";
}

export function getPublicOrigin(request?: Request): string {
  const fromEnv = process.env.GRID_PUBLIC_ORIGIN?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (request) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export function buildBookingUrls(origin: string, inviteCode: string, joinCode: string) {
  const base = origin.replace(/\/$/, "");
  const invite = inviteCode.toUpperCase();
  const join = joinCode.toUpperCase();

  return {
    join_url: `${base}/e/${invite}`,
    play_url: `${base}/e/${invite}/team/${join}`,
    lobby_url: `${base}/e/${invite}/lobby/${join}`,
    cockpit_url: `${base}/cockpit/${invite}`,
    show_url: `${base}/cockpit/${invite}/show`,
  };
}

export async function findEventByBookingReference(
  organizationId: string,
  bookingReference: string,
): Promise<EventRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, invite_code, title, status, organization_id, city_id, booking_reference, content_config, route_override, max_players_per_team, portal_token",
    )
    .eq("organization_id", organizationId)
    .eq("booking_reference", bookingReference.trim())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as EventRow | null) ?? null;
}

async function loadTeamsForEvent(eventId: string): Promise<TeamRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, join_code, name, status, current_level, game_state, started_at, finished_at")
    .eq("event_id", eventId)
    .order("join_code", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TeamRow[]) ?? [];
}

async function countActivePlayers(teamId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .is("left_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

function parseScore(gameState: unknown): number {
  if (!gameState || typeof gameState !== "object") return 0;
  const score = (gameState as { score?: number }).score;
  return typeof score === "number" ? score : 0;
}

function readContentPackSlug(contentConfig: unknown): string | null {
  if (!contentConfig || typeof contentConfig !== "object") return null;
  const slug = (contentConfig as { content_pack_slug?: string }).content_pack_slug;
  return slug?.trim() || null;
}

export async function buildBookingResponse(input: {
  event: EventRow;
  teams: TeamRow[];
  origin: string;
  blueprintSlug: BlueprintSlug;
  idempotent?: boolean;
}): Promise<GridBookingResponse> {
  const origin = input.origin.replace(/\/$/, "");
  const portalToken = await ensureEventPortalToken(input.event.id, input.event.portal_token);
  const codeByTeam = await ensureTeamAccessCodesForEvent({
    organizationId: input.event.organization_id,
    eventId: input.event.id,
    eventTitle: input.event.title,
    bookingReference: input.event.booking_reference,
  });

  const teams: GridBookingTeam[] = input.teams.map((team) => {
    const teamUrls = buildBookingUrls(input.origin, input.event.invite_code, team.join_code);
    const accessCode = codeByTeam.get(team.id) ?? null;
    return {
      join_code: team.join_code,
      team_name: team.name,
      play_url: accessCode ? `${origin}/go/${accessCode}` : teamUrls.play_url,
      lobby_url: teamUrls.lobby_url,
      access_code: accessCode,
    };
  });

  return {
    event_id: input.event.id,
    invite_code: input.event.invite_code,
    blueprint_slug: input.blueprintSlug,
    content_pack_slug: readContentPackSlug(input.event.content_config),
    booking_reference: input.event.booking_reference,
    join_url: `${origin}/go`,
    entry_url: `${origin}/go`,
    cockpit_url: buildBookingUrls(input.origin, input.event.invite_code, "").cockpit_url,
    show_url: buildBookingUrls(input.origin, input.event.invite_code, "").show_url,
    event_portal_url: buildEventPortalUrl(origin, portalToken),
    teams,
    idempotent: input.idempotent,
  };
}

export async function provisionGridBooking(input: {
  organizationId: string;
  orgSlug: string;
  body: GridBookingRequest;
  inviteCode: string;
  joinCodes: Array<{ joinCode: string; teamName: string }>;
}): Promise<{ event: EventRow; teams: TeamRow[] }> {
  const blueprintSlug = resolveBookingBlueprint(input.orgSlug, input.body.blueprint_slug);
  const blueprint = getBlueprint(blueprintSlug);
  const citySlug = input.body.city_slug ?? blueprint.defaultContent.city_slug ?? DEFAULT_CITY_SLUG;
  const routeOverride = parseRouteOverride(input.body.route_override ?? {});

  let cityId: string | null = null;
  if (blueprint.capabilities.gps) {
    const { getCityIdBySlug } = await import("@/lib/grid/organizations");
    cityId = await getCityIdBySlug(input.organizationId, citySlug);
    if (!cityId) {
      throw new Error(`City "${citySlug}" not found`);
    }
  }

  const contentConfig = {
    ...buildDefaultContentConfig(blueprintSlug),
    ...(blueprint.capabilities.gps ? { city_slug: citySlug } : {}),
    ...(input.body.content_pack_slug?.trim()
      ? { content_pack_slug: input.body.content_pack_slug.trim() }
      : {}),
  };

  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      title: input.body.title.trim(),
      organization_id: input.organizationId,
      city_id: cityId,
      invite_code: input.inviteCode,
      status: "lobby",
      max_teams: input.body.team_count,
      max_players_per_team: input.body.players_per_team ?? 8,
      booking_reference: input.body.booking_reference?.trim() || null,
      scheduled_start_at: input.body.scheduled_start_at ?? null,
      content_config: contentConfig,
      route_override: routeOverride,
      portal_token: generatePortalToken(),
    })
    .select(
      "id, invite_code, title, status, organization_id, city_id, booking_reference, content_config, route_override, max_players_per_team, portal_token",
    )
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message ?? "Event creation failed");
  }

  const teams: TeamRow[] = [];

  for (const team of input.joinCodes) {
    const { data: inserted, error: teamError } = await supabase
      .from("teams")
      .insert({
        event_id: event.id,
        organization_id: input.organizationId,
        join_code: team.joinCode,
        name: team.teamName,
        max_size: input.body.players_per_team ?? 8,
        status: "setup",
      })
      .select("id, join_code, name, status, current_level, game_state, started_at, finished_at")
      .single();

    if (teamError || !inserted) {
      throw new Error(teamError?.message ?? "Team creation failed");
    }

    teams.push(inserted as TeamRow);
  }

  return { event: event as EventRow, teams };
}

export async function getEventStatusByInviteCode(
  inviteCode: string,
): Promise<GridEventStatusResponse | null> {
  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, invite_code, title, status, booking_reference")
    .eq("invite_code", inviteCode.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!event) return null;

  const teams = await loadTeamsForEvent(event.id);
  const teamStatuses: GridEventTeamStatus[] = [];

  for (const team of teams) {
    teamStatuses.push({
      team_id: team.id,
      join_code: team.join_code,
      team_name: team.name,
      status: team.status,
      current_level: team.current_level ?? 1,
      score: parseScore(team.game_state),
      active_player_count: await countActivePlayers(team.id),
      started_at: team.started_at,
      finished_at: team.finished_at,
    });
  }

  return {
    event_id: event.id,
    invite_code: event.invite_code,
    title: event.title,
    status: event.status,
    booking_reference: event.booking_reference,
    teams: teamStatuses,
  };
}

export function validateBookingRequest(body: GridBookingRequest): string | null {
  const title = body.title?.trim();
  if (!title || title.length < 3) {
    return "title must be at least 3 characters";
  }
  if (!Number.isInteger(body.team_count) || body.team_count < 1 || body.team_count > 500) {
    return "team_count must be between 1 and 500";
  }
  const playersPerTeam = body.players_per_team ?? 8;
  if (playersPerTeam < 1 || playersPerTeam > MAX_PLAYERS_PER_TEAM) {
    return `players_per_team must be between 1 and ${MAX_PLAYERS_PER_TEAM}`;
  }
  return null;
}

export { authorizeGridApi as authorizeBookingApi } from "@/lib/grid/api-auth";
