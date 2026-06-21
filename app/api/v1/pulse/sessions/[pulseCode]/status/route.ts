import { NextResponse } from "next/server";
import { authorizeGridApi } from "@/lib/grid/api-auth";
import { getPulseSessionStatus } from "@/lib/grid/pulse-api";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

type RouteContext = {
  params: Promise<{ pulseCode: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  if (!authorizeGridApi(request)) {
    return unauthorized();
  }

  const { pulseCode } = await context.params;

  try {
    const status = await getPulseSessionStatus(pulseCode);
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const httpStatus = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status: httpStatus });
  }
}
