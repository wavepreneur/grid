import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeGridApi } from "@/lib/grid/api-auth";
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
  const { data: batch } = await supabase
    .from("studio_access_batches")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: codes } = await supabase
    .from("studio_access_codes")
    .select("code, status, redeemed_at, last_joined_at, valid_from, valid_until, revoked_at")
    .eq("batch_id", id)
    .order("created_at", { ascending: true });

  const header = "code,status,redeemed_at,last_joined_at,valid_until,revoked_at";
  const lines = (codes ?? []).map((row) => {
    const status = effectiveAccessStatus({
      status: row.status as AccessStatus,
      valid_from: row.valid_from,
      valid_until: row.valid_until,
    });
    return [row.code, status, row.redeemed_at ?? "", row.last_joined_at ?? "", row.valid_until ?? "", row.revoked_at ?? ""]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(",");
  });

  const csv = `${header}\n${lines.join("\n")}\n`;
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${String(batch.name).replace(/[^\w\-]+/g, "-")}-codes.csv"`,
    },
  });
}
