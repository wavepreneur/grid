"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventContent, getEventContentRevision } from "@/app/actions/content";
import { getGameState } from "@/app/actions/game";
import { GameRoom } from "@/components/game/game-room";
import { GameGateSkeleton } from "@/components/game/game-gate-skeleton";
import { GridError } from "@/components/grid/grid-shell";
import { cacheEventContent } from "@/lib/grid/offline-content";
import { eventTeamJoinPath } from "@/lib/grid/event-routes";
import {
  abandonTeamSession,
  resolveTeamSession,
} from "@/lib/grid/session-recovery";
import { teamEntryPath } from "@/lib/grid/team-routes";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
import type { PlayerSession } from "@/lib/grid/types";

type GameGateProps = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
  eventTitle?: string;
};

export function GameGate({
  inviteCode,
  joinCode,
  teamName,
  eventTitle = "Mission",
}: GameGateProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [eventContent, setEventContent] = useState<ResolvedEventContent | null>(null);
  const [contentRevision, setContentRevision] = useState(1);
  const [initialState, setInitialState] = useState<Awaited<
    ReturnType<typeof getGameState>
  > | null>(null);
  const contentRevisionRef = useRef(1);

  useEffect(() => {
    contentRevisionRef.current = contentRevision;
  }, [contentRevision]);

  useEffect(() => {
    Promise.all([
      resolveTeamSession(inviteCode, joinCode),
      getEventContent(inviteCode),
    ]).then(async ([resolved, contentResult]) => {
      if (!resolved) {
        abandonTeamSession();
        router.replace(eventTeamJoinPath(inviteCode, joinCode));
        return;
      }

      if (!contentResult.success) {
        setError(contentResult.error);
        return;
      }

      const syncedSession = resolved.session;

      if (syncedSession.teamStatus === "lobby" || syncedSession.teamStatus === "setup") {
        router.replace(teamEntryPath(inviteCode, joinCode, syncedSession.teamStatus ?? "lobby"));
        return;
      }

      // Manual start returns before game_state is written — retry with visible wait.
      let gameResult = await getGameState({
        inviteCode,
        joinCode,
        sessionId: syncedSession.sessionId,
      });

      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (!gameResult.success) break;
        const levels = gameResult.data.gameState?.levels ?? {};
        if (Object.keys(levels).length > 0) break;
        await new Promise((resolve) => window.setTimeout(resolve, 400));
        gameResult = await getGameState({
          inviteCode,
          joinCode,
          sessionId: syncedSession.sessionId,
        });
      }

      if (!gameResult.success) {
        abandonTeamSession();
        router.replace(eventTeamJoinPath(inviteCode, joinCode));
        return;
      }

      const { eventId, contentRevision, ...resolvedContent } = contentResult.data;
      const freshContent: ResolvedEventContent = { ...resolvedContent };

      cacheEventContent(eventId, freshContent);
      setSession(syncedSession);
      setEventContent(freshContent);
      setContentRevision(contentRevision);
      setInitialState(gameResult);
      setReady(true);
    });
  }, [inviteCode, joinCode, router]);

  useEffect(() => {
    if (!ready) return;

    const interval = window.setInterval(async () => {
      const revisionResult = await getEventContentRevision(inviteCode);
      if (!revisionResult.success) return;
      if (revisionResult.data.contentRevision <= contentRevisionRef.current) return;

      const contentResult = await getEventContent(inviteCode);
      if (!contentResult.success) return;

      const { eventId, contentRevision: nextRevision, ...resolvedContent } = contentResult.data;
      const freshContent: ResolvedEventContent = { ...resolvedContent };

      cacheEventContent(eventId, freshContent);
      setEventContent(freshContent);
      setContentRevision(nextRevision);
    }, 12_000);

    return () => window.clearInterval(interval);
  }, [inviteCode, ready]);

  if (error) {
    return <GridError message={error} />;
  }

  if (!ready || !initialState?.success || !session || !eventContent) {
    return <GameGateSkeleton />;
  }

  return (
    <GameRoom
      inviteCode={inviteCode}
      joinCode={joinCode}
      playerSession={session}
      initialState={initialState.data}
      eventContent={eventContent}
      teamName={teamName}
      eventTitle={eventTitle}
    />
  );
}
