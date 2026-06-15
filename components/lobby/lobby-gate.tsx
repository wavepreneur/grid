"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLobbySnapshot } from "@/app/actions/lobby";
import { LobbyRoom } from "@/components/lobby/lobby-room";
import { GridError } from "@/components/grid/grid-shell";
import {
  abandonTeamSession,
  resolveTeamSession,
} from "@/lib/grid/session-recovery";
import type { LobbySnapshot, PlayerSession } from "@/lib/grid/types";

type LobbyGateProps = {
  inviteCode: string;
  joinCode: string;
};

export function LobbyGate({ inviteCode, joinCode }: LobbyGateProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveTeamSession(inviteCode, joinCode).then((resolved) => {
      if (!resolved) {
        abandonTeamSession();
        router.replace(`/join/${inviteCode}?team=${joinCode}`);
        return;
      }

      setSession(resolved.session);

      if (
        resolved.session.teamStatus === "playing" ||
        resolved.session.teamStatus === "finished"
      ) {
        router.replace(`/play/${inviteCode}/${joinCode}`);
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
  }, [inviteCode, joinCode, router]);

  if (error) {
    return <GridError message={error} />;
  }

  if (!snapshot || !session) {
    return (
      <p className="text-sm text-[var(--grid-muted)]">Lobby wird geladen…</p>
    );
  }

  return (
    <LobbyRoom
      inviteCode={inviteCode}
      joinCode={joinCode}
      initialSnapshot={snapshot}
      playerSession={session}
    />
  );
}
