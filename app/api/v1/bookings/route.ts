import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/grid/audit-log";
import {
  authorizeBookingApi,
  buildBookingResponse,
  findEventByBookingReference,
  getPublicOrigin,
  provisionGridBooking,
  resolveBookingBlueprint,
  validateBookingRequest,
  type GridBookingRequest,
} from "@/lib/grid/booking-api";
import { generateInviteCode, generateJoinCode } from "@/lib/grid/codes";
import { getOrganizationBySlug } from "@/lib/grid/organizations";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!authorizeBookingApi(request)) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const bookingReference = url.searchParams.get("booking_reference")?.trim();
  const orgSlug = url.searchParams.get("organization_slug")?.trim() ?? "exitmania";

  if (!bookingReference) {
    return NextResponse.json({ error: "booking_reference query param required" }, { status: 400 });
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug);
    if (!organization) {
      return NextResponse.json({ error: `Organization "${orgSlug}" not found` }, { status: 404 });
    }

    const event = await findEventByBookingReference(organization.id, bookingReference);
    if (!event) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    const { data: teams, error } = await supabase
      .from("teams")
      .select("id, join_code, name, status, current_level, game_state, started_at, finished_at")
      .eq("event_id", event.id)
      .order("join_code", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const blueprintSlug = resolveBookingBlueprint(orgSlug);
    const response = await buildBookingResponse({
      event,
      teams: teams ?? [],
      origin: getPublicOrigin(request),
      blueprintSlug,
      idempotent: true,
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!authorizeBookingApi(request)) {
    return unauthorized();
  }

  let body: GridBookingRequest;
  try {
    body = (await request.json()) as GridBookingRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validateBookingRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const orgSlug = body.organization_slug ?? "exitmania";

  try {
    const organization = await getOrganizationBySlug(orgSlug);
    if (!organization) {
      return NextResponse.json({ error: `Organization "${orgSlug}" not found` }, { status: 404 });
    }

    if (body.booking_reference?.trim()) {
      const existing = await findEventByBookingReference(organization.id, body.booking_reference);
      if (existing) {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const supabase = createAdminClient();
        const { data: teams } = await supabase
          .from("teams")
          .select("id, join_code, name, status, current_level, game_state, started_at, finished_at")
          .eq("event_id", existing.id)
          .order("join_code", { ascending: true });

        const response = await buildBookingResponse({
          event: existing,
          teams: teams ?? [],
          origin: getPublicOrigin(request),
          blueprintSlug: resolveBookingBlueprint(orgSlug, body.blueprint_slug),
          idempotent: true,
        });

        return NextResponse.json(response);
      }
    }

    const inviteCode = generateInviteCode();
    const joinCodes = Array.from({ length: body.team_count }, (_, index) => ({
      joinCode: generateJoinCode(),
      teamName: `Team ${index + 1}`,
    }));

    const { event, teams } = await provisionGridBooking({
      organizationId: organization.id,
      orgSlug,
      body,
      inviteCode,
      joinCodes,
    });

    const blueprintSlug = resolveBookingBlueprint(orgSlug, body.blueprint_slug);

    await writeAuditLog({
      organizationId: organization.id,
      eventId: event.id,
      action: "booking_created",
      payload: {
        title: body.title.trim(),
        team_count: body.team_count,
        players_per_team: body.players_per_team ?? 8,
        blueprint_slug: blueprintSlug,
        content_pack_slug: body.content_pack_slug ?? null,
        city_slug: body.city_slug ?? null,
        booking_reference: body.booking_reference ?? null,
      },
    });

    const response = await buildBookingResponse({
      event,
      teams,
      origin: getPublicOrigin(request),
      blueprintSlug,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
