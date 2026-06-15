"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  dismissSyncModal,
  purchaseHint,
  solveCurrentLevel,
} from "@/app/actions/game";
import { ExitmaniaLevelView } from "@/components/game/exitmania-level-view";
import { GameHud } from "@/components/game/game-hud";
import { LevelPanel } from "@/components/game/level-panel";
import { SyncModal } from "@/components/game/sync-modal";
import { IdentityBar } from "@/components/player/identity-bar";
import { SessionHandoffScreen } from "@/components/player/session-handoff-screen";
import { GridError } from "@/components/grid/grid-shell";
import { cockpitShowPath } from "@/lib/grid/event-routes";
import { useTeamSync } from "@/lib/hooks/use-team-sync";
import { cacheTeamState } from "@/lib/grid/offline-state";
import type { TeamGameState, TeamRealtimeState } from "@/lib/grid/game-state";
import type { ResolvedEventContent, SolveLevelPayload } from "@/lib/grid/level-types";
import type { PlayerSession } from "@/lib/grid/types";

type GameRoomProps = {
  inviteCode: string;
  joinCode: string;
  playerSession: PlayerSession;
  initialState: TeamRealtimeState;
  eventContent: ResolvedEventContent;
  teamName: string;
  eventTitle?: string;
};

function countCompletedLevels(gameState: TeamGameState): number {
  return Object.values(gameState.levels).filter((entry) => entry.status === "completed").length;
}

export function GameRoom({
  inviteCode,
  joinCode,
  playerSession,
  initialState,
  eventContent,
  teamName,
  eventTitle = "Mission",
}: GameRoomProps) {
  const [teamState, setTeamState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [sessionSuperseded, setSessionSuperseded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isHintPending, startHintTransition] = useTransition();

  const handleStateUpdate = useCallback((gameState: TeamGameState, currentLevel: number) => {
    setTeamState((current) => {
      const next = { ...current, gameState, currentLevel };
      cacheTeamState(next);
      return next;
    });
  }, []);

  const handleTeamStatusChange = useCallback((status: string) => {
    setTeamState((current) => {
      const next = { ...current, status };
      cacheTeamState(next);
      return next;
    });
  }, []);

  const { isConnected, error: realtimeError } = useTeamSync({
    sessionId: playerSession.sessionId,
    teamId: playerSession.teamId,
    playerId: playerSession.playerId,
    enabled: !sessionSuperseded,
    onGameStateChange: handleStateUpdate,
    onTeamStatusChange: handleTeamStatusChange,
    onSessionSuperseded: () => setSessionSuperseded(true),
  });

  const activeLevel = teamState.currentLevel;
  const levelState = teamState.gameState.levels[String(activeLevel)];
  const isFinished = teamState.status === "finished";
  const modal = teamState.gameState.modal;
  const completedLevels = useMemo(
    () => countCompletedLevels(teamState.gameState),
    [teamState.gameState],
  );

  const currentLevelDefinition = eventContent.levels.find((level) => level.level === activeLevel);
  const isNavigator = playerSession.isNavigator || Boolean(teamState.isNavigator);
  const purchasedHints = teamState.gameState.purchased_tile_hints[String(activeLevel)] ?? {};
  const solveDisabled = levelState?.status !== "active" || Boolean(modal) || isHintPending;

  function handlePurchaseHint(tileId: string) {
    setError(null);
    startHintTransition(async () => {
      const result = await purchaseHint({
        inviteCode,
        joinCode,
        sessionId: playerSession.sessionId,
        tileId,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setTeamState((current) => {
        const levelKey = String(current.currentLevel);
        const nextGameState = {
          ...current.gameState,
          score: result.data.score,
          purchased_tile_hints: {
            ...current.gameState.purchased_tile_hints,
            [levelKey]: {
              ...(current.gameState.purchased_tile_hints[levelKey] ?? {}),
              [tileId]: { text: result.data.hintText, cost: result.data.cost },
            },
          },
        };
        const next = { ...current, gameState: nextGameState };
        cacheTeamState(next);
        return next;
      });
    });
  }

  function handleSolveLevel(payload: SolveLevelPayload) {
    setError(null);
    startTransition(async () => {
      const result = await solveCurrentLevel({
        inviteCode,
        joinCode,
        sessionId: playerSession.sessionId,
        payload,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setTeamState(result.data);
      cacheTeamState(result.data);
    });
  }

  function handleDismissModal() {
    if (!modal) return;
    startTransition(async () => {
      const result = await dismissSyncModal({
        inviteCode,
        joinCode,
        sessionId: playerSession.sessionId,
        modalId: modal.id,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setTeamState(result.data);
      cacheTeamState(result.data);
    });
  }

  return (
    <>
      <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
        <IdentityBar
          inviteCode={inviteCode}
          joinCode={joinCode}
          session={playerSession}
          showCopyPlayLink
        />

        {sessionSuperseded ? (
          <SessionHandoffScreen
            inviteCode={inviteCode}
            joinCode={joinCode}
            playerId={playerSession.playerId}
            displayName={playerSession.displayName}
          />
        ) : (
          <>
            <GameHud
          inviteCode={inviteCode}
          teamName={teamName}
          eventTitle={eventTitle}
          currentLevel={activeLevel}
          totalLevels={eventContent.levels.length}
          completedLevels={completedLevels}
          score={teamState.gameState.score ?? 0}
          startedAt={teamState.startedAt}
          missionDurationMinutes={eventContent.missionDurationMinutes}
          showLiveScore={eventContent.showLiveScore}
          isConnected={isConnected}
        />

        {isFinished ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-6 text-sm text-emerald-100">
            <p className="text-xl font-semibold text-emerald-200">Mission abgeschlossen!</p>
            <p className="mt-2">
              {teamName} · {eventContent.levels.length} Level ·{" "}
              <span className="font-semibold text-white">
                {teamState.gameState.score ?? 0} Punkte
              </span>
            </p>
            {eventContent.showLiveScore ? (
              <Link
                href={cockpitShowPath(inviteCode)}
                className="mt-4 inline-block text-[var(--grid-accent)] underline-offset-2 hover:underline"
              >
                Live-Ranking ansehen →
              </Link>
            ) : null}
          </div>
        ) : currentLevelDefinition ? (
          eventContent.uiLayout === "exitmania" ? (
            <ExitmaniaLevelView
              level={currentLevelDefinition}
              allLevels={eventContent.levels}
              levelStatuses={teamState.gameState.levels}
              purchasedHints={purchasedHints}
              score={teamState.gameState.score ?? 0}
              disabled={solveDisabled}
              isPending={isPending || isHintPending}
              isNavigator={isNavigator}
              onSubmit={handleSolveLevel}
              onPurchaseHint={handlePurchaseHint}
            />
          ) : (
            <LevelPanel
              level={currentLevelDefinition}
              disabled={solveDisabled}
              isPending={isPending}
              isNavigator={isNavigator}
              onSubmit={handleSolveLevel}
            />
          )
        ) : (
          <GridError message="Level-Inhalt konnte nicht geladen werden." />
        )}

        {realtimeError ? <GridError message={realtimeError} /> : null}
        {error ? <GridError message={error} /> : null}
          </>
        )}
      </div>

      {modal && !sessionSuperseded ? (
        <SyncModal modal={modal} onDismiss={handleDismissModal} isPending={isPending} />
      ) : null}
    </>
  );
}
