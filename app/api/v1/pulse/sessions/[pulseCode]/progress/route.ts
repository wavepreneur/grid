import { NextResponse } from "next/server";
import { authorizeGridApi } from "@/lib/grid/api-auth";
import {
  upsertPulsePlayerProgress,
  validatePulseProgressRequest,
  type PulseProgressRequest,
} from "@/lib/grid/pulse-api";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

type RouteContext = {
  params: Promise<{ pulseCode: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!authorizeGridApi(request)) {
    return unauthorized();
  }

  const { pulseCode } = await context.params;

  let body: PulseProgressRequest;
  try {
    body = (await request.json()) as PulseProgressRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validatePulseProgressRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const result = await upsertPulsePlayerProgress(pulseCode, body);
    return NextResponse.json({
      ok: true,
      pulse_code: pulseCode.trim().toUpperCase(),
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message.includes("not found")
      ? 404
      : message.includes("completed") || message.includes("cancelled")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
