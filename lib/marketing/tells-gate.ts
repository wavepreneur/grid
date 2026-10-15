import { SignJWT, jwtVerify } from "jose";

export const TELLS_GATE_COOKIE = "tells_gate";
export const TELLS_GATE_TTL_SECONDS = 60 * 60 * 24 * 30;

function gateSecret(): Uint8Array {
  const secret =
    process.env.TELLS_GATE_SECRET?.trim() ||
    process.env.GRID_PORTAL_SECRET?.trim() ||
    process.env.SUPABASE_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing TELLS_GATE_SECRET, GRID_PORTAL_SECRET, or SUPABASE_JWT_SECRET.");
  }
  return new TextEncoder().encode(secret);
}

export function tellsGateEnabled(): boolean {
  return Boolean(process.env.TELLS_GATE_PASSWORD?.trim());
}

export function isTellsGateBypass(pathname: string): boolean {
  return (
    pathname === "/gate" ||
    pathname.startsWith("/gate/") ||
    pathname === "/api/tells-gate" ||
    pathname.startsWith("/e/") ||
    pathname.startsWith("/api/v1/")
  );
}

export function safeGateNext(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    typeof raw === "string" &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.includes("://") &&
    !raw.startsWith("/gate") &&
    !raw.startsWith("/api/")
  ) {
    return raw;
  }
  return "/";
}

export async function signTellsGate(): Promise<string> {
  return new SignJWT({ typ: "tells_gate" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TELLS_GATE_TTL_SECONDS}s`)
    .sign(gateSecret());
}

export async function verifyTellsGate(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, gateSecret());
    return payload.typ === "tells_gate";
  } catch {
    return false;
  }
}

export function tellsGateCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: TELLS_GATE_TTL_SECONDS,
  };
}
