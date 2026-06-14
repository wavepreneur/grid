import { SignJWT } from "jose";

export type RealtimeAccessToken = {
  accessToken: string;
  expiresAt: string;
  teamId: string;
  playerId: string;
};

export async function signPlayerAccessToken(input: {
  playerId: string;
  sessionId: string;
  teamId: string;
}): Promise<RealtimeAccessToken> {
  const secretValue = process.env.SUPABASE_JWT_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!secretValue || !supabaseUrl) {
    throw new Error(
      "Missing SUPABASE_JWT_SECRET or NEXT_PUBLIC_SUPABASE_URL for Realtime auth.",
    );
  }

  const secret = new TextEncoder().encode(secretValue);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const accessToken = await new SignJWT({
    role: "authenticated",
    session_id: input.sessionId,
    player_id: input.playerId,
    team_id: input.teamId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.playerId)
    .setAudience("authenticated")
    .setIssuer(`${supabaseUrl}/auth/v1`)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);

  return {
    accessToken,
    expiresAt: expiresAt.toISOString(),
    teamId: input.teamId,
    playerId: input.playerId,
  };
}
