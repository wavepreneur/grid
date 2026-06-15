"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
import { getGameState } from "@/app/actions/game";
import { GameRoom } from "@/components/game/game-room";
import { GridError } from "@/components/grid/grid-shell";
import { cacheEventContent } from "@/lib/grid/offline-content";
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
    Promise.all([
      resolveTeamSession(inviteCode, joinCode),
      getEventContent(inviteCode),
    ]).then(async ([resolved, contentResult]) => {
      if (!resolved) {
        abandonTeamSession();
        router.replace(`/join/${inviteCode}?team=${joinCode}`);
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

      const gameResult = await getGameState({
        inviteCode,
        joinCode,
        sessionId: syncedSession.sessionId,
      });

      if (!gameResult.success) {
        abandonTeamSession();
        router.replace(`/join/${inviteCode}?team=${joinCode}`);
        return;
      }

      const freshContent: ResolvedEventContent = {
        templateSlug: contentResult.data.templateSlug,
        templateName: contentResult.data.templateName,
        city: contentResult.data.city,
        levels: contentResult.data.levels,
      };

      cacheEventContent(contentResult.data.eventId, freshContent);
      setSession(syncedSession);
      setEventContent(freshContent);
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
