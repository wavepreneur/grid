import { NextResponse } from "next/server";
import { authorizeGridApi } from "@/lib/grid/api-auth";
import { getPublicOrigin } from "@/lib/grid/booking-api";
import {
  buildPulseSessionUrls,
  createPulseSession,
  validatePulseSessionRequest,
  type PulseSessionCreateRequest,
} from "@/lib/grid/pulse-api";
import { getOrganizationBySlug } from "@/lib/grid/organizations";
import { createAdminClient } from "@/lib/supabase/admin";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!authorizeGridApi(request)) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const pulseCode = url.searchParams.get("pulse_code")?.trim();
  const bookingReference = url.searchParams.get("booking_reference")?.trim();
  const orgSlug = url.searchParams.get("organization_slug")?.trim() ?? "tabbrain";

  if (!pulseCode && !bookingReference) {
    return NextResponse.json(
      { error: "pulse_code or booking_reference query param required" },
      { status: 400 },
    );
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug);
    if (!organization) {
      return NextResponse.json({ error: `Organization "${orgSlug}" not found` }, { status: 404 });
    }

    const supabase = createAdminClient();
    let query = supabase
      .from("pulse_sessions")
      .select(
        "id, pulse_code, title, status, channel, duration_minutes, booking_reference, started_at, completed_at",
      )
      .eq("organization_id", organization.id);

    if (pulseCode) {
      query = query.eq("pulse_code", pulseCode.toUpperCase());
    } else if (bookingReference) {
      query = query.eq("booking_reference", bookingReference);
    }

    const { data: session, error } = await query.maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!session) {
      return NextResponse.json({ error: "Pulse session not found" }, { status: 404 });
    }

    const urls = buildPulseSessionUrls(getPublicOrigin(request), session.pulse_code);

    return NextResponse.json({
      pulse_session_id: session.id,
      pulse_code: session.pulse_code,
      title: session.title,
      status: session.status,
      channel: session.channel,
      duration_minutes: session.duration_minutes,
      play_mode: "async_pulse",
      booking_reference: session.booking_reference,
      started_at: session.started_at,
      completed_at: session.completed_at,
      ...urls,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!authorizeGridApi(request)) {
    return unauthorized();
  }

  let body: PulseSessionCreateRequest;
  try {
    body = (await request.json()) as PulseSessionCreateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validatePulseSessionRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const response = await createPulseSession(body, getPublicOrigin(request));
    return NextResponse.json(response, { status: response.idempotent ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
