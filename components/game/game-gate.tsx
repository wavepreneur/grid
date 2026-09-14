"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
import { getGameState, prepareTeamGame } from "@/app/actions/game";
import { rewindUnplayedStudioTestToLobby } from "@/app/actions/lobby";
import { GameRoom } from "@/components/game/game-room";
import { GameGateSkeleton } from "@/components/game/game-gate-skeleton";
import { GridError } from "@/components/grid/grid-shell";
import {
  cacheEventContent,
  loadCachedEventContent,
} from "@/lib/grid/offline-content";
import { eventLobbyPath, eventTeamJoinPath } from "@/lib/grid/event-routes";
import { useQuietContentRefresh } from "@/lib/hooks/use-quiet-content-refresh";
import {
  abandonTeamSession,
  resolveTeamSession,
} from "@/lib/grid/session-recovery";
import {
  clearMissionStarting,
  isMissionStarting,
  missionStartPlayerCount,
  missionStartProgress,
  persistStartProgress,
  startOverlayCopy,
} from "@/lib/grid/mission-start-signal";
import { savePlayerSession } from "@/lib/grid/player-session";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
import type { PlayerSession } from "@/lib/grid/types";

type GameGateProps = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
  eventTitle?: string;
  /** Studio / GRID-Pilot: stay in lobby until Start, without waiting for content. */
  holdForBriefing?: boolean;
};

const PLAY_READY_TIMEOUT_MS = 45_000;

function isPlayReady(result: Awaited<ReturnType<typeof getGameState>>): boolean {
  return (
    result.success &&
    (result.data.status === "playing" || result.data.status === "finished") &&
    result.data.gameState.content_ready !== false
  );
}

/** Open GameRoom only after the team row is playing (and content is ready). */
async function waitForPlayReady(
  input: {
    inviteCode: string;
    joinCode: string;
    sessionId: string;
  },
  isCancelled: () => boolean,
) {
  const started = Date.now();
  let last = await getGameState(input);
  while (!isCancelled() && !isPlayReady(last)) {
    if (Date.now() - started >= PLAY_READY_TIMEOUT_MS) break;
    if (
      last.success &&
      (last.data.status === "playing" || last.data.status === "finished") &&
      last.data.gameState.content_ready === false
    ) {
      void prepareTeamGame(input);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 200));
    last = await getGameState(input);
  }
  return last;
}

function unwrapContent(
  result: Awaited<ReturnType<typeof getEventContent>>,
): ResolvedEventContent | null {
  if (!result.success) return null;
  const { eventId: _eventId, contentRevision: _revision, ...content } = result.data;
  return content;
}

export function GameGate({
  inviteCode,
  joinCode,
  teamName,
  eventTitle = "Mission",
  holdForBriefing = false,
}: GameGateProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(() =>
    typeof window === "undefined" ? 8 : missionStartProgress(inviteCode, joinCode),
  );
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [eventContent, setEventContent] = useState<ResolvedEventContent | null>(null);
  const [contentRevision, setContentRevision] = useState(1);
  const [initialState, setInitialState] = useState<Awaited<
    ReturnType<typeof getGameState>
  > | null>(null);
  const contentRevisionRef = useRef(1);
  const overlay = startOverlayCopy(missionStartPlayerCount(inviteCode, joinCode));

  useEffect(() => {
    contentRevisionRef.current = contentRevision;
  }, [contentRevision]);

  const applyQuietContent = useCallback((content: ResolvedEventContent, revision: number) => {
    setEventContent(content);
    setContentRevision(revision);
  }, []);

  const pullIfNewer = useQuietContentRefresh({
    inviteCode,
    enabled: ready,
    revisionRef: contentRevisionRef,
    onUpdated: applyQuietContent,
  });

  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.max(current, missionStartProgress(inviteCode, joinCode));
        persistStartProgress(inviteCode, joinCode, next);
        return next;
      });
    }, 80);
    return () => window.clearInterval(id);
  }, [ready, inviteCode, joinCode]);

  useEffect(() => {
    let cancelled = false;

    function bump(next: number) {
      setProgress((current) => {
        const value = persistStartProgress(inviteCode, joinCode, Math.max(current, next));
        return Math.max(current, value);
      });
    }

    async function boot() {
      bump(missionStartProgress(inviteCode, joinCode));
      const resolved = await resolveTeamSession(inviteCode, joinCode);
      if (cancelled) return;
      if (!resolved) {
        abandonTeamSession();
        router.replace(eventTeamJoinPath(inviteCode, joinCode));
        return;
      }

      bump(28);

      const peek = await getGameState({
        inviteCode,
        joinCode,
        sessionId: resolved.session.sessionId,
      });
      if (cancelled) return;

      if (!peek.success) {
        setError(peek.error);
        return;
      }

      const starting = isMissionStarting(inviteCode, joinCode);
      const studioNeedsBriefing =
        holdForBriefing &&
        !starting &&
        (peek.data.status === "lobby" ||
          peek.data.status === "setup" ||
          (peek.data.status === "playing" && !peek.data.gameState.briefing_confirmed));

      if (studioNeedsBriefing) {
        if (peek.data.status === "playing") {
          await rewindUnplayedStudioTestToLobby({
            inviteCode,
            joinCode,
            sessionId: resolved.session.sessionId,
          });
        }
        router.replace(eventLobbyPath(inviteCode, joinCode));
        return;
      }

      bump(48);

      const cached = loadCachedEventContent(inviteCode);
      const contentPromise = cached
        ? Promise.resolve({
            content: cached,
            revision: contentRevisionRef.current,
            error: null as string | null,
          })
        : getEventContent(inviteCode).then((result) => {
            const content = unwrapContent(result);
            return {
              content,
              revision: result.success ? result.data.contentRevision : 1,
              error: content ? null : (result.success ? null : result.error),
            };
          });

      const playPromise = isPlayReady(peek)
        ? Promise.resolve(peek)
        : waitForPlayReady(
            {
              inviteCode,
              joinCode,
              sessionId: resolved.session.sessionId,
            },
            () => cancelled,
          );

      const [gameResult, contentResult] = await Promise.all([playPromise, contentPromise]);
      if (cancelled) return;

      if (!gameResult.success) {
        setError(gameResult.error);
        return;
      }

      if (!isPlayReady(gameResult)) {
        clearMissionStarting(inviteCode, joinCode);
        router.replace(eventLobbyPath(inviteCode, joinCode));
        return;
      }

      let freshContent = contentResult.content;
      if (!freshContent) {
        setError(contentResult.error ?? "Inhalt konnte nicht geladen werden.");
        return;
      }

      cacheEventContent(inviteCode, freshContent);
      setContentRevision(contentResult.revision);

      if (cached) {
        void getEventContent(inviteCode).then((result) => {
          if (!result.success || cancelled) return;
          const next = unwrapContent(result);
          if (!next) return;
          cacheEventContent(inviteCode, next);
          setEventContent(next);
          setContentRevision(result.data.contentRevision);
        });
      }

      const syncedSession = {
        ...resolved.session,
        teamStatus: gameResult.data.status as PlayerSession["teamStatus"],
      };
      savePlayerSession(syncedSession);

      bump(100);
      setSession(syncedSession);
      setEventContent(freshContent);
      setInitialState(gameResult);
      setProgress(100);
      persistStartProgress(inviteCode, joinCode, 100);
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      if (cancelled) return;
      clearMissionStarting(inviteCode, joinCode);
      setReady(true);
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [holdForBriefing, inviteCode, joinCode, router]);

  if (error) {
    return <GridError message={error} />;
  }

  if (!ready || !initialState?.success || !session || !eventContent) {
    return (
      <GameGateSkeleton
        title={overlay.title}
        subtitle={overlay.subtitle}
        progress={progress}
      />
    );
  }

  return (
    <GameRoom
      inviteCode={inviteCode}
      joinCode={joinCode}
      session={session}
      initialState={initialState.data}
      eventContent={eventContent}
      teamName={teamName}
      eventTitle={eventTitle}
      onQuietContentUpdate={pullIfNewer}
    />
  );
}
