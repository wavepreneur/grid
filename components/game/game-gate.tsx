"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
import { getGameState } from "@/app/actions/game";
import { GameRoom } from "@/components/game/game-room";
import { GridError } from "@/components/grid/grid-shell";
import { cacheEventContent, loadCachedEventContent } from "@/lib/grid/offline-content";
import { loadPlayerSessionForTeam } from "@/lib/grid/player-session";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
import type { PlayerSession } from "@/lib/grid/types";

type GameGateProps = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
};

export function GameGate({ inviteCode, joinCode, teamName }: GameGateProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [eventContent, setEventContent] = useState<ResolvedEventContent | null>(null);
  const [initialState, setInitialState] = useState<Awaited<
    ReturnType<typeof getGameState>
  > | null>(null);

  useEffect(() => {
    const playerSession = loadPlayerSessionForTeam(inviteCode, joinCode);
    if (!playerSession) {
      router.replace(`/join/${inviteCode}?team=${joinCode}`);
      return;
    }

    setSession(playerSession);

    Promise.all([
      getGameState({
        inviteCode,
        joinCode,
        sessionId: playerSession.sessionId,
      }),
      getEventContent(inviteCode),
    ]).then(([gameResult, contentResult]) => {
      if (!gameResult.success) {
        setError(gameResult.error);
        return;
      }

      if (!contentResult.success) {
        setError(contentResult.error);
        return;
      }

      if (gameResult.data.status === "lobby") {
        router.replace(`/join/${inviteCode}/lobby/${joinCode}`);
        return;
      }

      const cached = loadCachedEventContent(contentResult.data.eventId);
      const content = cached ?? {
        templateSlug: contentResult.data.templateSlug,
        templateName: contentResult.data.templateName,
        city: contentResult.data.city,
        levels: contentResult.data.levels,
      };

      cacheEventContent(contentResult.data.eventId, content);
      setEventContent(content);
      setInitialState(gameResult);
      setReady(true);
    });
  }, [inviteCode, joinCode, router]);

  if (error) {
    return <GridError message={error} />;
  }

  if (!ready || !initialState?.success || !session || !eventContent) {
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
      eventContent={eventContent}
      teamName={teamName}
    />
  );
}
