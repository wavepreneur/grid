import { NextResponse } from "next/server";
import { authorizeBookingApi, getEventStatusByInviteCode } from "@/lib/grid/booking-api";
import { normalizeCode } from "@/lib/grid/codes";

type RouteParams = {
  params: Promise<{ inviteCode: string }>;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(_request: Request, { params }: RouteParams) {
  if (!authorizeBookingApi(_request)) {
    return unauthorized();
  }

  const { inviteCode } = await params;
  const normalized = normalizeCode(inviteCode);

  try {
    const status = await getEventStatusByInviteCode(normalized);
    if (!status) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
