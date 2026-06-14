"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLobbySnapshot } from "@/app/actions/lobby";
import { LobbyRoom } from "@/components/lobby/lobby-room";
import { GridError } from "@/components/grid/grid-shell";
import { loadPlayerSessionForTeam } from "@/lib/grid/player-session";
import type { LobbySnapshot } from "@/lib/grid/types";

type LobbyGateProps = {
  inviteCode: string;
  joinCode: string;
};

export function LobbyGate({ inviteCode, joinCode }: LobbyGateProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = loadPlayerSessionForTeam(inviteCode, joinCode);
    if (!session) {
      router.replace(`/join/${inviteCode}?team=${joinCode}`);
      return;
    }

    getLobbySnapshot({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
    }).then((result) => {
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSnapshot(result.data);
    });
  }, [inviteCode, joinCode, router]);

  const session = loadPlayerSessionForTeam(inviteCode, joinCode);

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
