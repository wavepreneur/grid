import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeGridApi } from "@/lib/grid/api-auth";
import { getOrganizationBySlug } from "@/lib/grid/organizations";
import { getPublicOrigin } from "@/lib/grid/booking-api";
import { provisionStudioAccessBatch, type AccessKind } from "@/lib/grid/access";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

type Body = {
  organization_slug?: string;
  game_id?: string;
  name?: string;
  kind?: AccessKind;
  quantity?: number;
  players_per_team?: number;
  max_activations?: number | null;
  valid_until?: string | null;
  booking_reference?: string;
  idempotency_key?: string;
};

export async function POST(request: Request) {
  if (!authorizeGridApi(request)) return unauthorized();

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const orgSlug = body.organization_slug ?? "exitmania";
  const kind: AccessKind = body.kind === "event_pool" ? "event_pool" : "team";
  const name = body.name?.trim();
  if (!name || name.length < 3) {
    return NextResponse.json({ error: "name must be at least 3 characters" }, { status: 400 });
  }
  if (!body.game_id) {
    return NextResponse.json({ error: "game_id required" }, { status: 400 });
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug);
    if (!organization) {
      return NextResponse.json({ error: `Organization "${orgSlug}" not found` }, { status: 404 });
    }

    const bookingRef = (body.booking_reference ?? body.idempotency_key)?.trim() || null;
    const supabase = createAdminClient();

    if (bookingRef) {
      const { data: existing } = await supabase
        .from("studio_access_batches")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("booking_reference", bookingRef)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          await serializeBatch(existing.id, getPublicOrigin(request), true),
        );
      }
    }

    const { data: game } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", body.game_id)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (!game) {
      return NextResponse.json({ error: "game not found" }, { status: 404 });
    }
    if (game.status !== "published" || game.published_version_number < 1) {
      return NextResponse.json({ error: "game_not_published" }, { status: 409 });
    }

    const { data: version } = await supabase
      .from("studio_game_versions")
      .select("id")
      .eq("game_id", game.id)
      .eq("version_number", game.published_version_number)
      .maybeSingle();

    if (!version) {
      return NextResponse.json({ error: "published version missing" }, { status: 409 });
    }

    const result = await provisionStudioAccessBatch({
      organizationId: organization.id,
      name,
      kind,
      game,
      versionId: version.id,
      teamCount: Math.max(1, Math.min(500, Math.floor(body.quantity ?? 1))),
      playersPerTeam: Math.max(1, Math.min(8, Math.floor(body.players_per_team ?? 5))),
      maxActivations:
        kind === "event_pool" ? Math.max(1, Math.floor(body.max_activations ?? body.quantity ?? 1)) : null,
      validFrom: null,
      validUntil: body.valid_until ?? null,
      bookingReference: bookingRef,
    });

    return NextResponse.json(await serializeBatch(result.batchId, getPublicOrigin(request)), {
      status: 201,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

async function serializeBatch(batchId: string, origin: string, idempotent = false) {
  const supabase = createAdminClient();
  const { data: batch, error } = await supabase
    .from("studio_access_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();
  if (error || !batch) throw new Error(error?.message ?? "Batch not found");

  const { data: codes } = await supabase
    .from("studio_access_codes")
    .select("code, status, team_id, redeemed_at, valid_until, revoked_at")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  const base = origin.replace(/\/$/, "");
  return {
    batch_id: batch.id,
    name: batch.name,
    kind: batch.kind,
    event_id: batch.event_id,
    entry_url: `${base}/go`,
    csv_url: `${base}/api/v1/access-batches/${batch.id}/csv`,
    max_activations: batch.max_activations,
    used_activations: batch.used_activations,
    valid_until: batch.valid_until,
    idempotent,
    accesses: (codes ?? []).map((row) => ({
      code: row.code,
      status: row.status,
      redeem_url: `${base}/go/${row.code}`,
      redeemed_at: row.redeemed_at,
      valid_until: row.valid_until,
      revoked_at: row.revoked_at,
    })),
  };
}
