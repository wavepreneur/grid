"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getGameState } from "@/app/actions/game";
import { GameRoom } from "@/components/game/game-room";
import { GridError } from "@/components/grid/grid-shell";
import { loadPlayerSessionForTeam } from "@/lib/grid/player-session";

type GameGateProps = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
};

export function GameGate({ inviteCode, joinCode, teamName }: GameGateProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [initialState, setInitialState] = useState<Awaited<
    ReturnType<typeof getGameState>
  > | null>(null);
  const session = loadPlayerSessionForTeam(inviteCode, joinCode);

  useEffect(() => {
    if (!session) {
      router.replace(`/join/${inviteCode}?team=${joinCode}`);
      return;
    }

    getGameState({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
    }).then((result) => {
      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.data.status === "lobby") {
        router.replace(`/join/${inviteCode}/lobby/${joinCode}`);
        return;
      }

      setInitialState(result);
      setReady(true);
    });
  }, [inviteCode, joinCode, router, session]);

  if (error) {
    return <GridError message={error} />;
  }

  if (!ready || !initialState?.success || !session) {
    return (
      <p className="text-sm text-[var(--grid-muted)]">Spiel wird geladen…</p>
    );
  }

  return (
    <GameRoom
      inviteCode={inviteCode}
      joinCode={joinCode}
      playerSession={session}
      initialState={initialState.data}
      teamName={teamName}
    />
  );
}
