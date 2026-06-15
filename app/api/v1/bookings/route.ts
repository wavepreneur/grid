import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/grid/audit-log";
import { generateInviteCode, generateJoinCode } from "@/lib/grid/codes";
import {
  getCityIdBySlug,
  getOrganizationBySlug,
} from "@/lib/grid/organizations";
import { DEFAULT_CITY_SLUG } from "@/lib/grid/level-types";

type BookingRequest = {
  organization_slug?: string;
  title: string;
  team_count: number;
  players_per_team?: number;
  city_slug?: string;
  booking_reference?: string;
  scheduled_start_at?: string;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-grid-api-key");
  const expectedKey = process.env.GRID_BOOKING_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return unauthorized();
  }

  let body: BookingRequest;
  try {
    body = (await request.json()) as BookingRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim();
  const teamCount = body.team_count;
  const playersPerTeam = body.players_per_team ?? 8;
  const orgSlug = body.organization_slug ?? "exitmania";
  const citySlug = body.city_slug ?? DEFAULT_CITY_SLUG;

  if (!title || title.length < 3) {
    return NextResponse.json({ error: "title must be at least 3 characters" }, { status: 400 });
  }
  if (!Number.isInteger(teamCount) || teamCount < 1 || teamCount > 500) {
    return NextResponse.json({ error: "team_count must be between 1 and 500" }, { status: 400 });
  }
  if (playersPerTeam < 1 || playersPerTeam > 8) {
    return NextResponse.json({ error: "players_per_team must be between 1 and 8" }, { status: 400 });
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug);
    if (!organization) {
      return NextResponse.json({ error: `Organization "${orgSlug}" not found` }, { status: 404 });
    }

    const cityId = await getCityIdBySlug(organization.id, citySlug);
    if (!cityId) {
      return NextResponse.json({ error: `City "${citySlug}" not found` }, { status: 404 });
    }

    const supabase = createAdminClient();
    const inviteCode = generateInviteCode();

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        title,
        organization_id: organization.id,
        city_id: cityId,
        invite_code: inviteCode,
        status: "lobby",
        max_teams: teamCount,
        max_players_per_team: playersPerTeam,
        booking_reference: body.booking_reference?.trim() || null,
        scheduled_start_at: body.scheduled_start_at ?? null,
        content_config: { city_slug: citySlug },
      })
      .select("id, invite_code")
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: eventError?.message ?? "Event creation failed" }, { status: 500 });
    }

    const teams: Array<{ join_code: string; team_name: string }> = [];

    for (let index = 1; index <= teamCount; index += 1) {
      const joinCode = generateJoinCode();
      const teamName = `Team ${index}`;

      const { error: teamError } = await supabase.from("teams").insert({
        event_id: event.id,
        organization_id: organization.id,
        join_code: joinCode,
        name: teamName,
        max_size: playersPerTeam,
        status: "setup",
      });

      if (teamError) {
        return NextResponse.json({ error: teamError.message }, { status: 500 });
      }

      teams.push({ join_code: joinCode, team_name: teamName });
    }

    await writeAuditLog({
      organizationId: organization.id,
      eventId: event.id,
      action: "booking_created",
      payload: {
        title,
        team_count: teamCount,
        players_per_team: playersPerTeam,
        city_slug: citySlug,
        booking_reference: body.booking_reference ?? null,
      },
    });

    return NextResponse.json({
      event_id: event.id,
      invite_code: event.invite_code,
      join_url: `/join/${event.invite_code}`,
      teams,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
