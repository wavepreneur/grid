import { SignJWT, jwtVerify } from "jose";

export const PORTAL_COOKIE = "grid_portal";
export const PORTAL_TTL_SECONDS = 60 * 60 * 24 * 7;

export type PortalSession = {
  email: string;
};

function getPortalSecret(): Uint8Array {
  const secret =
    process.env.GRID_PORTAL_SECRET?.trim() || process.env.SUPABASE_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing GRID_PORTAL_SECRET or SUPABASE_JWT_SECRET.");
  }
  return new TextEncoder().encode(secret);
}

export async function signPortalSession(email: string): Promise<string> {
  return new SignJWT({ email, typ: "grid_portal" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PORTAL_TTL_SECONDS}s`)
    .sign(getPortalSecret());
}

export async function verifyPortalSession(token?: string): Promise<PortalSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getPortalSecret());
    if (payload.typ !== "grid_portal" || typeof payload.email !== "string") return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function portalCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: PORTAL_TTL_SECONDS,
  };
}
