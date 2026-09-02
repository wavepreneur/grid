import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeGridApi } from "@/lib/grid/api-auth";
import { getPublicOrigin } from "@/lib/grid/booking-api";
import { effectiveAccessStatus, type AccessStatus } from "@/lib/grid/access";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!authorizeGridApi(request)) return unauthorized();
  const { id } = await context.params;
  const supabase = createAdminClient();
  const { data: batch, error } = await supabase
    .from("studio_access_batches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: codes } = await supabase
    .from("studio_access_codes")
    .select("code, status, redeemed_at, valid_from, valid_until, revoked_at")
    .eq("batch_id", id)
    .order("created_at", { ascending: true });

  const origin = getPublicOrigin(request).replace(/\/$/, "");
  const rows = codes ?? [];
  const counts = { unused: 0, redeemed: 0, expired: 0, revoked: 0 };
  for (const row of rows) {
    const status = effectiveAccessStatus({
      status: row.status as AccessStatus,
      valid_from: row.valid_from,
      valid_until: row.valid_until,
    });
    counts[status] += 1;
  }

  return NextResponse.json({
    batch_id: batch.id,
    name: batch.name,
    kind: batch.kind,
    counts,
    used_activations: batch.used_activations,
    max_activations: batch.max_activations,
    entry_url: `${origin}/go`,
    accesses: rows.map((row) => ({
      code: row.code,
      status: effectiveAccessStatus({
        status: row.status as AccessStatus,
        valid_from: row.valid_from,
        valid_until: row.valid_until,
      }),
      redeem_url: `${origin}/go/${row.code}`,
      redeemed_at: row.redeemed_at,
      valid_until: row.valid_until,
    })),
  });
}
