import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeGridApi } from "@/lib/grid/api-auth";
import { normalizeCode } from "@/lib/grid/codes";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  if (!authorizeGridApi(request)) return unauthorized();
  const { code } = await context.params;
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("studio_access_codes")
    .update({ status: "revoked", revoked_at: now })
    .eq("code", normalizeCode(code))
    .select("code, status, revoked_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
