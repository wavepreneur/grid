"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLobbySnapshot } from "@/app/actions/lobby";
import { LobbyRoom } from "@/components/lobby/lobby-room";
import { IdentityBar } from "@/components/player/identity-bar";
import { GridError } from "@/components/grid/grid-shell";
import { eventPlayPath, eventTeamJoinPath } from "@/lib/grid/event-routes";
import {
  abandonTeamSession,
  resolveTeamSession,
} from "@/lib/grid/session-recovery";
import type { LobbySnapshot, PlayerSession } from "@/lib/grid/types";

type LobbyGateProps = {
  inviteCode: string;
  joinCode: string;
  manageMode?: boolean;
};

export function LobbyGate({ inviteCode, joinCode, manageMode = false }: LobbyGateProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveTeamSession(inviteCode, joinCode).then((resolved) => {
      if (!resolved) {
        abandonTeamSession();
        router.replace(eventTeamJoinPath(inviteCode, joinCode));
        return;
      }

      setSession(resolved.session);

      const isPlaying =
        resolved.session.teamStatus === "playing" ||
        resolved.session.teamStatus === "finished";

      if (isPlaying && !manageMode) {
        router.replace(eventPlayPath(inviteCode, joinCode));
        return;
      }

      getLobbySnapshot({
        inviteCode,
        joinCode,
        sessionId: resolved.session.sessionId,
      }).then((result) => {
        if (!result.success) {
          setError(result.error);
          return;
        }

        setSnapshot(result.data);
      });
    });
  }, [inviteCode, joinCode, manageMode, router]);

  if (error) {
    return <GridError message={error} />;
  }

  if (!session) {
    return (
      <p className="text-sm text-[var(--grid-muted)]">Lobby wird geladen…</p>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex flex-col gap-4">
        <IdentityBar inviteCode={inviteCode} joinCode={joinCode} session={session} />
        <p className="text-sm text-[var(--grid-muted)]">Team-Daten werden geladen…</p>
      </div>
    );
  }

  return (
    <LobbyRoom
      inviteCode={inviteCode}
      joinCode={joinCode}
      initialSnapshot={snapshot}
      playerSession={session}
      manageMode={manageMode}
    />
  );
}
