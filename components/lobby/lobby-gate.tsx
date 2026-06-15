"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLobbySnapshot } from "@/app/actions/lobby";
import { LobbyRoom } from "@/components/lobby/lobby-room";
import { GridError } from "@/components/grid/grid-shell";
import { loadPlayerSessionForTeam } from "@/lib/grid/player-session";
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
    const playerSession = loadPlayerSessionForTeam(inviteCode, joinCode);
    if (!playerSession) {
      router.replace(`/join/${inviteCode}?team=${joinCode}`);
      return;
    }

    setSession(playerSession);

    getLobbySnapshot({
      inviteCode,
      joinCode,
      sessionId: playerSession.sessionId,
    }).then((result) => {
      if (!result.success) {
        setError(result.error);
        return;
      }

      if (
        result.data.team_status === "playing" ||
        result.data.team_status === "finished"
      ) {
        router.replace(`/play/${inviteCode}/${joinCode}`);
        return;
      }

      setSnapshot(result.data);
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
