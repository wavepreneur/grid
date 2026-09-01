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
  isMissionStarting,
} from "@/lib/grid/mission-start-signal";
import { savePlayerSession } from "@/lib/grid/player-session";
import { teamEntryPath } from "@/lib/grid/team-routes";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
import type { PlayerSession } from "@/lib/grid/types";

type GameGateProps = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
  eventTitle?: string;
};

async function waitForContentReady(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}) {
  const first = await getGameState(input);
  if (first.success && first.data.gameState.content_ready !== false) {
    return first;
  }

  void prepareTeamGame(input);

  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 200));
    const gameResult = await getGameState(input);
    if (gameResult.success && gameResult.data.gameState.content_ready !== false) {
      return gameResult;
    }
  }

  return getGameState(input);
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
  const [progress, setProgress] = useState(6);
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
    const started = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const creep = Math.min(82, 8 + (elapsed / 3500) * 74);
      setProgress((current) => Math.max(current, creep));
    }, 80);
    return () => window.clearInterval(id);
  }, [ready]);

  useEffect(() => {
    let cancelled = false;

    function bump(next: number) {
      setProgress((current) => Math.max(current, next));
    }

    async function boot() {
      bump(12);
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

      bump(48);

      let syncedSession = resolved.session;
      const starting = isMissionStarting(inviteCode, joinCode);

      if (syncedSession.teamStatus === "lobby" || syncedSession.teamStatus === "setup") {
        if (!starting) {
          router.replace(
            teamEntryPath(inviteCode, joinCode, syncedSession.teamStatus ?? "lobby"),
          );
          return;
        }
        // Start is already in flight — don't wait up to 12s for the DB row.
        syncedSession = { ...syncedSession, teamStatus: "playing" };
        savePlayerSession(syncedSession);
      }

      clearMissionStarting(inviteCode, joinCode);
      bump(62);

      const gameResult = await waitForContentReady({
        inviteCode,
        joinCode,
        sessionId: syncedSession.sessionId,
      });

      if (cancelled) return;

      if (!gameResult.success) {
        abandonTeamSession();
        router.replace(eventTeamJoinPath(inviteCode, joinCode));
        return;
      }

      bump(94);
      setSession(syncedSession);
      setEventContent(freshContent);
      setInitialState(gameResult);
      setProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 280));
      if (cancelled) return;
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
