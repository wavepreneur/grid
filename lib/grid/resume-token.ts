import { SignJWT, jwtVerify } from "jose";
import { normalizeCode } from "@/lib/grid/codes";

const RESUME_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

export type PlayerResumePayload = {
  playerId: string;
  teamId: string;
  inviteCode: string;
  joinCode: string;
};

function getResumeSecret(): Uint8Array {
  const secretValue = process.env.SUPABASE_JWT_SECRET;
  if (!secretValue) {
    throw new Error("Missing SUPABASE_JWT_SECRET for player resume tokens.");
  }
  return new TextEncoder().encode(secretValue);
}

export async function signPlayerResumeToken(
  payload: PlayerResumePayload,
): Promise<string> {
  const secret = getResumeSecret();

  return new SignJWT({
    player_id: payload.playerId,
    team_id: payload.teamId,
    invite_code: normalizeCode(payload.inviteCode),
    join_code: normalizeCode(payload.joinCode),
    typ: "player_resume",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${RESUME_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyPlayerResumeToken(
  token: string,
): Promise<PlayerResumePayload | null> {
  try {
    const secret = getResumeSecret();
    const { payload } = await jwtVerify(token, secret);

    if (payload.typ !== "player_resume") return null;

    const playerId = payload.player_id;
    const teamId = payload.team_id;
    const inviteCode = payload.invite_code;
    const joinCode = payload.join_code;

    if (
      typeof playerId !== "string" ||
      typeof teamId !== "string" ||
      typeof inviteCode !== "string" ||
      typeof joinCode !== "string"
    ) {
      return null;
    }

    return { playerId, teamId, inviteCode, joinCode };
  } catch {
    return null;
  }
}
