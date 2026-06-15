"use client";

import {
  claimPlayerSession,
  getPlayerResumeToken,
  recoverSessionByPlayerId,
  verifyTeamSession,
} from "@/app/actions/lobby";
import {
  clearPlayerSession,
  loadPlayerIdForTeam,
  loadPlayerSessionForTeam,
  savePlayerSession,
} from "@/lib/grid/player-session";
import { readResumeTokenFromUrl, syncResumeTokenInUrl } from "@/lib/grid/play-url";
import type { PlayerSession } from "@/lib/grid/types";

export type ResolvedTeamSession = {
  session: PlayerSession;
  path: string;
};

async function attachResumeTokenToUrl(session: PlayerSession): Promise<void> {
  const tokenResult = await getPlayerResumeToken({
    inviteCode: session.inviteCode,
    joinCode: session.joinCode,
    sessionId: session.sessionId,
  });

  if (tokenResult.success) {
    syncResumeTokenInUrl(tokenResult.data.resumeToken);
  }
}

export async function resolveTeamSession(
  inviteCode: string,
  joinCode: string,
  teamId?: string,
): Promise<ResolvedTeamSession | null> {
  const resumeToken = readResumeTokenFromUrl();
  if (resumeToken) {
    const claimed = await claimPlayerSession({
      inviteCode,
      joinCode,
      resumeToken,
    });

    if (claimed.success) {
      savePlayerSession(claimed.data.session);
      syncResumeTokenInUrl(claimed.data.resumeToken);
      return {
        session: claimed.data.session,
        path: claimed.data.path,
      };
    }
  }

  const existing = loadPlayerSessionForTeam(inviteCode, joinCode);
  if (existing) {
    const verified = await verifyTeamSession({
      inviteCode,
      joinCode,
      sessionId: existing.sessionId,
    });

    if (verified.success) {
      savePlayerSession(verified.data.session);
      await attachResumeTokenToUrl(verified.data.session);
      return verified.data;
    }
  }

  const playerId = loadPlayerIdForTeam(inviteCode, joinCode, teamId);
  if (!playerId) {
    return null;
  }

  const recovered = await recoverSessionByPlayerId({
    inviteCode,
    joinCode,
    playerId,
  });

  if (!recovered.success) {
    return null;
  }

  savePlayerSession(recovered.data.session);
  await attachResumeTokenToUrl(recovered.data.session);
  return recovered.data;
}

export function abandonTeamSession(): void {
  clearPlayerSession();
}
