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

      const gameResult = await getGameState({
        inviteCode,
        joinCode,
        sessionId: syncedSession.sessionId,
      });

      if (!gameResult.success) {
        abandonTeamSession();
        router.replace(eventTeamJoinPath(inviteCode, joinCode));
        return;
      }

      const freshContent: ResolvedEventContent = {
        templateSlug: contentResult.data.templateSlug,
        templateName: contentResult.data.templateName,
        city: contentResult.data.city,
        levels: contentResult.data.levels,
        blueprintSlug: contentResult.data.blueprintSlug,
        archetype: contentResult.data.archetype,
        capabilities: contentResult.data.capabilities,
        uiLayout: contentResult.data.uiLayout,
        showLiveScore: contentResult.data.showLiveScore,
        missionDurationMinutes: contentResult.data.missionDurationMinutes,
      };

      cacheEventContent(contentResult.data.eventId, freshContent);
      setSession(syncedSession);
      setEventContent(freshContent);
      setContentRevision(contentResult.data.contentRevision);
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

      const freshContent: ResolvedEventContent = {
        templateSlug: contentResult.data.templateSlug,
        templateName: contentResult.data.templateName,
        city: contentResult.data.city,
        levels: contentResult.data.levels,
        blueprintSlug: contentResult.data.blueprintSlug,
        archetype: contentResult.data.archetype,
        capabilities: contentResult.data.capabilities,
        uiLayout: contentResult.data.uiLayout,
        showLiveScore: contentResult.data.showLiveScore,
        missionDurationMinutes: contentResult.data.missionDurationMinutes,
      };

      cacheEventContent(contentResult.data.eventId, freshContent);
      setEventContent(freshContent);
      setContentRevision(contentResult.data.contentRevision);
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
