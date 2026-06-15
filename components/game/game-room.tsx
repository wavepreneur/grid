"use client";

import { useCallback, useState, useTransition } from "react";
import {
  dismissSyncModal,
  solveCurrentLevel,
} from "@/app/actions/game";
import { LevelPanel } from "@/components/game/level-panel";
import { SyncModal } from "@/components/game/sync-modal";
import {
  GridError,
  GridStat,
} from "@/components/grid/grid-shell";
import { useTeamSync } from "@/lib/hooks/use-team-sync";
import { cacheTeamState } from "@/lib/grid/offline-state";
import type { TeamGameState, TeamRealtimeState } from "@/lib/grid/game-state";
import type { LevelDefinition, ResolvedEventContent, SolveLevelPayload } from "@/lib/grid/level-types";
import type { PlayerSession } from "@/lib/grid/types";

type GameRoomProps = {
  inviteCode: string;
  joinCode: string;
  playerSession: PlayerSession;
  initialState: TeamRealtimeState;
  eventContent: ResolvedEventContent;
  teamName: string;
};

export function GameRoom({
  inviteCode,
  joinCode,
  playerSession,
  initialState,
  eventContent,
  teamName,
}: GameRoomProps) {
  const [teamState, setTeamState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStateUpdate = useCallback((gameState: TeamGameState, currentLevel: number) => {
    setTeamState((current) => {
      const next = {
        ...current,
        gameState,
        currentLevel,
      };
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
    enabled: true,
    onGameStateChange: handleStateUpdate,
    onTeamStatusChange: handleTeamStatusChange,
  });

  const activeLevel = teamState.currentLevel;
  const levelState = teamState.gameState.levels[String(activeLevel)];
  const isFinished = teamState.status === "finished";
  const modal = teamState.gameState.modal;

  const currentLevelDefinition: LevelDefinition | undefined = eventContent.levels.find(
    (level) => level.level === activeLevel,
  );

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

  const roleLabel = playerSession.isCaptain
    ? "Captain"
    : playerSession.isNavigator
      ? "Team Lead (GPS)"
      : "Mitspieler";

  return (
    <>
      <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <GridStat label="Team" value={teamName} />
        <GridStat
          label="Du bist"
          value={roleLabel}
        />
        <GridStat
          label="Level"
          value={`${Math.min(activeLevel, eventContent.levels.length)} / ${eventContent.levels.length}`}
        />
          <GridStat label="Route" value={eventContent.templateName} />
          <GridStat label="Punkte" value={String(teamState.gameState.score ?? 0)} />
          <GridStat
            label="Realtime"
            value={isConnected ? "Live verbunden" : "Verbinde…"}
          />
        </div>

        {isFinished ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-300">
            Mission abgeschlossen — alle {eventContent.levels.length} Level geschafft!
          </div>
        ) : currentLevelDefinition ? (
          <LevelPanel
            level={currentLevelDefinition}
            disabled={levelState?.status !== "active" || Boolean(modal)}
            isPending={isPending}
            isNavigator={
              playerSession.isNavigator || Boolean(teamState.isNavigator)
            }
            onSubmit={handleSolveLevel}
          />
        ) : (
          <GridError message="Level-Inhalt konnte nicht geladen werden." />
        )}

        {realtimeError ? <GridError message={realtimeError} /> : null}
        {error ? <GridError message={error} /> : null}
      </div>

      {modal ? (
        <SyncModal
          modal={modal}
          onDismiss={handleDismissModal}
          isPending={isPending}
        />
      ) : null}
    </>
  );
}
