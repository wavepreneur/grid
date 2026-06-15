"use client";

import { recoverSessionByPlayerId, verifyTeamSession } from "@/app/actions/lobby";
import {
  clearPlayerSession,
  loadPlayerIdForTeam,
  loadPlayerSessionForTeam,
  savePlayerSession,
} from "@/lib/grid/player-session";
import type { PlayerSession } from "@/lib/grid/types";

export type ResolvedTeamSession = {
  session: PlayerSession;
  path: string;
};

export async function resolveTeamSession(
  inviteCode: string,
  joinCode: string,
  teamId?: string,
): Promise<ResolvedTeamSession | null> {
  const existing = loadPlayerSessionForTeam(inviteCode, joinCode);
  if (existing) {
    const verified = await verifyTeamSession({
      inviteCode,
      joinCode,
      sessionId: existing.sessionId,
    });

    if (verified.success) {
      savePlayerSession(verified.data.session);
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
  return recovered.data;
}

export function abandonTeamSession(): void {
  clearPlayerSession();
}
