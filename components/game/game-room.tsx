"use client";

import { useCallback, useState, useTransition } from "react";
import {
  dismissSyncModal,
  solveCurrentLevel,
} from "@/app/actions/game";
import { SyncModal } from "@/components/game/sync-modal";
import {
  GridButton,
  GridError,
  GridStat,
} from "@/components/grid/grid-shell";
import { useTeamSync } from "@/lib/hooks/use-team-sync";
import { cacheTeamState } from "@/lib/grid/offline-state";
import type { TeamGameState, TeamRealtimeState } from "@/lib/grid/game-state";
import type { PlayerSession } from "@/lib/grid/types";

type GameRoomProps = {
  inviteCode: string;
  joinCode: string;
  playerSession: PlayerSession;
  initialState: TeamRealtimeState;
  teamName: string;
};

export function GameRoom({
  inviteCode,
  joinCode,
  playerSession,
  initialState,
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

  function handleSolveLevel() {
    setError(null);

    startTransition(async () => {
      const result = await solveCurrentLevel({
        inviteCode,
        joinCode,
        sessionId: playerSession.sessionId,
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
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3">
          <GridStat label="Team" value={teamName} />
          <GridStat
            label="Level"
            value={`${Math.min(activeLevel, teamState.gameState.total_levels)} / ${teamState.gameState.total_levels}`}
          />
          <GridStat
            label="Realtime"
            value={isConnected ? "Live verbunden" : "Verbinde…"}
          />
          <GridStat
            label="Status"
            value={isFinished ? "Abgeschlossen" : "Aktiv"}
          />
        </div>

        {isFinished ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-300">
            Alle Demo-Level abgeschlossen. Phase 3 liefert die echte Exitmania-Engine
            mit GPS-Routen und Custom-Quizzes.
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--grid-border)] bg-black/20 p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
              Demo-Level {activeLevel}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Platzhalter-Rätsel
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--grid-muted)]">
              Phase-2-Test: Wenn ein Spieler das Rätsel löst, sehen alle Teammitglieder
              sofort das Sync-Modal und wechseln gemeinsam zum nächsten Level.
            </p>

            <GridButton
              type="button"
              className="mt-6"
              disabled={
                isPending ||
                levelState?.status !== "active" ||
                Boolean(modal)
              }
              onClick={handleSolveLevel}
            >
              {isPending ? "Sende…" : "Rätsel gelöst"}
            </GridButton>
          </div>
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
