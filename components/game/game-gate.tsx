"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventContent, getEventContentRevision } from "@/app/actions/content";
import { getGameState, prepareTeamGame } from "@/app/actions/game";
import { GameRoom } from "@/components/game/game-room";
import { GameGateSkeleton } from "@/components/game/game-gate-skeleton";
import { GridError } from "@/components/grid/grid-shell";
import {
  cacheEventContent,
  loadCachedEventContent,
} from "@/lib/grid/offline-content";
import { eventTeamJoinPath } from "@/lib/grid/event-routes";
import {
  abandonTeamSession,
  resolveTeamSession,
} from "@/lib/grid/session-recovery";
import {
  clearMissionStarting,
  missionStartBegunAt,
  missionStartProgress,
  persistStartProgress,
} from "@/lib/grid/mission-start-signal";
import { savePlayerSession } from "@/lib/grid/player-session";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
import type { PlayerSession } from "@/lib/grid/types";

type GameGateProps = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
  eventTitle?: string;
};

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
  let last = await getGameState(input);
  while (!isCancelled() && !isPlayReady(last)) {
    if (
      last.success &&
      (last.data.status === "playing" || last.data.status === "finished") &&
      last.data.gameState.content_ready === false
    ) {
      void prepareTeamGame(input);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    last = await getGameState(input);
  }
  return last;
}

export function GameGate({
  inviteCode,
  joinCode,
  teamName,
  eventTitle = "Mission",
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

  useEffect(() => {
    contentRevisionRef.current = contentRevision;
  }, [contentRevision]);

  useEffect(() => {
    if (ready) return;
    const started = missionStartBegunAt(inviteCode, joinCode) ?? Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const crept = Math.min(88, 8 + (elapsed / 4500) * 80);
      setProgress((current) => {
        const next = Math.max(current, crept);
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
      const cached = loadCachedEventContent(inviteCode);
      const [resolved, contentResult] = await Promise.all([
        resolveTeamSession(inviteCode, joinCode),
        cached ? Promise.resolve(null) : getEventContent(inviteCode),
      ]);

      if (cancelled) return;
      bump(32);

      if (!resolved) {
        abandonTeamSession();
        router.replace(eventTeamJoinPath(inviteCode, joinCode));
        return;
      }

      let freshContent = cached;
      if (!freshContent) {
        if (!contentResult?.success) {
          setError(contentResult?.error ?? "Inhalt konnte nicht geladen werden.");
          return;
        }
        const { eventId: _eventId, contentRevision: revision, ...resolvedContent } =
          contentResult.data;
        freshContent = resolvedContent;
        cacheEventContent(inviteCode, freshContent);
        setContentRevision(revision);
      } else {
        void getEventContent(inviteCode).then((result) => {
          if (!result.success || cancelled) return;
          const { contentRevision: revision, eventId: _id, ...resolvedContent } = result.data;
          cacheEventContent(inviteCode, resolvedContent);
          setEventContent(resolvedContent);
          setContentRevision(revision);
        });
      }

      bump(62);

      const gameResult = await waitForPlayReady(
        {
          inviteCode,
          joinCode,
          sessionId: resolved.session.sessionId,
        },
        () => cancelled,
      );

      if (cancelled) return;

      if (!gameResult.success) {
        setError(gameResult.error);
        return;
      }

      if (!isPlayReady(gameResult)) return;

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
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      if (cancelled) return;
      clearMissionStarting(inviteCode, joinCode);
      setReady(true);
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [inviteCode, joinCode, router]);

  useEffect(() => {
    if (!ready) return;

    const interval = window.setInterval(async () => {
      const revisionResult = await getEventContentRevision(inviteCode);
      if (!revisionResult.success) return;
      if (revisionResult.data.contentRevision <= contentRevisionRef.current) return;

      const contentResult = await getEventContent(inviteCode);
      if (!contentResult.success) return;

      const { contentRevision: nextRevision, eventId: _id, ...resolvedContent } =
        contentResult.data;
      cacheEventContent(inviteCode, resolvedContent);
      setEventContent(resolvedContent);
      setContentRevision(nextRevision);
    }, 12_000);

    return () => window.clearInterval(interval);
  }, [inviteCode, ready]);

  if (error) {
    return <GridError message={error} />;
  }

  if (!ready || !initialState?.success || !session || !eventContent) {
    return (
      <GameGateSkeleton
        title="Alle Geräte laden…"
        subtitle="Die Mission startet gemeinsam — niemand legt allein los."
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
    />
  );
}
