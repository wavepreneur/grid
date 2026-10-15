import { NextRequest, NextResponse } from "next/server";
import { passwordsMatch } from "@/lib/marketing/tells-gate-password";
import {
  TELLS_GATE_COOKIE,
  safeGateNext,
  signTellsGate,
  tellsGateCookieOptions,
  tellsGateEnabled,
} from "@/lib/marketing/tells-gate";

const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 12;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function allow(ip: string): boolean {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now >= row.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (row.count >= MAX_PER_WINDOW) return false;
  row.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  if (!tellsGateEnabled()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  if (!allow(clientIp(request))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { password?: unknown; next?: unknown } = {};
  try {
    body = (await request.json()) as { password?: unknown; next?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!passwordsMatch(password)) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const token = await signTellsGate();
  const res = NextResponse.json({ ok: true, next: safeGateNext(typeof body.next === "string" ? body.next : "/") });
  res.cookies.set(TELLS_GATE_COOKIE, token, tellsGateCookieOptions());
  return res;
}
