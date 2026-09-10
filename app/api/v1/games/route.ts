import { NextResponse } from "next/server";
import { authorizeBookingApi } from "@/lib/grid/booking-api";
import { getOrganizationBySlug } from "@/lib/grid/organizations";
import { listPublishedStudioGames } from "@/lib/grid/studio-booking";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!authorizeBookingApi(request)) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const orgSlug = url.searchParams.get("organization_slug")?.trim() || "exitmania";

  try {
    const organization = await getOrganizationBySlug(orgSlug);
    if (!organization) {
      return NextResponse.json({ error: `Organization "${orgSlug}" not found` }, { status: 404 });
    }

    const games = await listPublishedStudioGames(organization.id);
    return NextResponse.json({ games });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
