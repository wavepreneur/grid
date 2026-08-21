"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  advanceFromHub,
  dismissSyncModal,
  purchaseHint,
  skipBonusPhase,
  solveCurrentLevel,
  submitArrivalQuiz,
  submitBonusAnswer,
} from "@/app/actions/game";
import { usesMissionShell } from "@/lib/grid/blueprints";
import { CityPlayShell } from "@/components/game/city/play-shell";
import { BigButton } from "@/components/game/city/ui";
import { ExitmaniaLevelView } from "@/components/game/exitmania-level-view";
import { GameHud } from "@/components/game/game-hud";
import { LevelPanel } from "@/components/game/level-panel";
import { PlayPhaseFlow } from "@/components/game/play-phase-flow";
import { SyncModal } from "@/components/game/sync-modal";
import type { SolveFeedbackState } from "@/components/game/solve-feedback-banner";
import { IdentityBar } from "@/components/player/identity-bar";
import { SessionHandoffScreen } from "@/components/player/session-handoff-screen";
import { GridError } from "@/components/grid/grid-shell";
import { cockpitShowPath } from "@/lib/grid/event-routes";
import { useTeamSync } from "@/lib/hooks/use-team-sync";
import { useMissionCountdown } from "@/lib/hooks/use-mission-countdown";
import { cacheTeamState } from "@/lib/grid/offline-state";
import { archetypeRoleLabel } from "@/lib/grid/archetype-roles";
import type { TeamGameState, TeamRealtimeState } from "@/lib/grid/game-state";
import type {
  GeolocationSample,
  ResolvedEventContent,
  SolveLevelPayload,
} from "@/lib/grid/level-types";
import type { PlayerSession } from "@/lib/grid/types";
import { usesPhasedPlay } from "@/lib/grid/play-slots";

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
  const [solveFeedback, setSolveFeedback] = useState<SolveFeedbackState | null>(null);
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

  const activeLevel = Number(teamState.currentLevel) || 1;
  const levelState = teamState.gameState.levels[String(activeLevel)];
  const levelStartedAt = levelState?.started_at ?? null;
  const isFinished = teamState.status === "finished";
  const modal = teamState.gameState.modal;
  const completedLevels = useMemo(
    () => countCompletedLevels(teamState.gameState),
    [teamState.gameState],
  );

  useEffect(() => {
    setSolveFeedback(null);
  }, [activeLevel]);

  const currentLevelDefinition =
    eventContent.levels.find((level) => Number(level.level) === activeLevel) ??
    (eventContent.levels.length === 1 ? eventContent.levels[0] : null);
  const isNavigator = playerSession.canUnlockGps || Boolean(teamState.isNavigator);
  const soloAlpha = playerSession.isAlpha && playerSession.effectiveBeta;
  const purchasedTileHints = teamState.gameState.purchased_tile_hints[String(activeLevel)] ?? {};
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
    setSolveFeedback(null);
    const attemptedAnswer =
      payload.answer?.trim() ||
      (payload.selectedOptionIds?.length
        ? payload.selectedOptionIds.join(", ")
        : payload.selectedOptionId) ||
      null;
    startTransition(async () => {
      const result = await solveCurrentLevel({
        inviteCode,
        joinCode,
        sessionId: playerSession.sessionId,
        payload,
      });
      if (!result.success) {
        setSolveFeedback({
          id: Date.now(),
          kind: "wrong",
          message: result.error,
          attemptedAnswer,
        });
        return;
      }
      const hasSuccessNote = Boolean(result.data?.gameState.modal?.body?.trim());
      if (!hasSuccessNote) {
        setSolveFeedback({
          id: Date.now(),
          kind: "correct",
        });
      } else {
        setSolveFeedback(null);
      }
      setTeamState(result.data!);
      cacheTeamState(result.data!);
    });
  }

  function applyTeamResult(result: { success: boolean; data?: TeamRealtimeState; error?: string }) {
    if (!result.success || !result.data) {
      setError(result.error ?? "Aktion fehlgeschlagen.");
      return;
    }
    setTeamState(result.data);
    cacheTeamState(result.data);
  }

  function handleArriveOutdoor(geolocation: GeolocationSample, targetLevel?: number) {
    setError(null);
    startTransition(async () => {
      applyTeamResult(
        await advanceFromHub({
          inviteCode,
          joinCode,
          sessionId: playerSession.sessionId,
          geolocation,
          targetLevel,
        }),
      );
    });
  }

  function handleSolveGpsCheckpoint(geolocation: GeolocationSample) {
    handleSolveLevel({ geolocation });
  }

  function handleOpenStation(levelNumber: number) {
    setError(null);
    startTransition(async () => {
      applyTeamResult(
        await advanceFromHub({
          inviteCode,
          joinCode,
          sessionId: playerSession.sessionId,
          targetLevel: levelNumber,
        }),
      );
    });
  }

  function handleSubmitStationCode(code: string) {
    setError(null);
    startTransition(async () => {
      applyTeamResult(
        await advanceFromHub({
          inviteCode,
          joinCode,
          sessionId: playerSession.sessionId,
          stationCode: code,
        }),
      );
    });
  }

  function handleStartMission(levelNumber: number) {
    setError(null);
    startTransition(async () => {
      applyTeamResult(
        await advanceFromHub({
          inviteCode,
          joinCode,
          sessionId: playerSession.sessionId,
          targetLevel: levelNumber,
        }),
      );
    });
  }

  function handleSubmitQuiz(payload: {
    selectedOptionId?: string;
    selectedOptionIds?: string[];
  }) {
    setError(null);
    startTransition(async () => {
      applyTeamResult(
        await submitArrivalQuiz({
          inviteCode,
          joinCode,
          sessionId: playerSession.sessionId,
          selectedOptionId: payload.selectedOptionId,
          selectedOptionIds: payload.selectedOptionIds,
        }),
      );
    });
  }

  function handleSubmitBonus(selectedOptionId: string) {
    setError(null);
    startTransition(async () => {
      applyTeamResult(
        await submitBonusAnswer({
          inviteCode,
          joinCode,
          sessionId: playerSession.sessionId,
          selectedOptionId,
        }),
      );
    });
  }

  function handleSkipBonus() {
    setError(null);
    startTransition(async () => {
      applyTeamResult(
        await skipBonusPhase({
          inviteCode,
          joinCode,
          sessionId: playerSession.sessionId,
        }),
      );
    });
  }

  const phased = usesPhasedPlay(eventContent);
  const { remainingLabel } = useMissionCountdown(
    teamState.startedAt,
    eventContent.missionDurationMinutes,
  );

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

  const playBody = sessionSuperseded ? (
    <SessionHandoffScreen
      inviteCode={inviteCode}
      joinCode={joinCode}
      playerId={playerSession.playerId}
      displayName={playerSession.displayName}
    />
  ) : isFinished ? (
    <div className="space-y-4 px-5 py-8">
      <p className="text-2xl font-bold text-[var(--cg-fg)]">Mission abgeschlossen!</p>
      <p className="text-base text-[var(--cg-muted)]">
        {teamName} · {eventContent.levels.length} Aufgaben ·{" "}
        <span className="font-semibold text-[var(--cg-fg)]">
          {teamState.gameState.score ?? 0} Punkte
        </span>
      </p>
      {eventContent.showLiveScore ? (
        <Link href={cockpitShowPath(inviteCode)}>
          <BigButton variant="accent">Live-Ranking ansehen</BigButton>
        </Link>
      ) : null}
    </div>
  ) : currentLevelDefinition ? (
    phased && usesMissionShell(eventContent) ? (
      <PlayPhaseFlow
        eventContent={eventContent}
        gameState={teamState.gameState}
        activeLevel={activeLevel}
        teamName={teamName}
        myName={playerSession.displayName}
        myRole={playerSession.archetypeRole}
        myRoleLabel={archetypeRoleLabel(playerSession.archetypeRole)}
        timeLabel={remainingLabel}
        purchasedHints={purchasedTileHints}
        score={teamState.gameState.score ?? 0}
        disabled={solveDisabled && teamState.gameState.current_phase !== "bonus"}
        isPending={isPending || isHintPending}
        canUnlockGps={isNavigator}
        effectiveBeta={playerSession.effectiveBeta}
        soloAlpha={soloAlpha}
        levelStartedAt={levelStartedAt}
        teamStartedAt={teamState.startedAt}
        solveFeedback={solveFeedback}
        onArriveOutdoor={handleArriveOutdoor}
        onSolveGpsCheckpoint={handleSolveGpsCheckpoint}
        onOpenStation={handleOpenStation}
        onSubmitStationCode={handleSubmitStationCode}
        onStartMission={handleStartMission}
        onSubmitQuiz={handleSubmitQuiz}
        onSolveLevel={handleSolveLevel}
        onPurchaseHint={handlePurchaseHint}
        onSubmitBonus={handleSubmitBonus}
        onSkipBonus={handleSkipBonus}
      />
    ) : usesMissionShell(eventContent) ? (
      <ExitmaniaLevelView
        level={currentLevelDefinition}
        allLevels={eventContent.levels}
        levelStatuses={teamState.gameState.levels}
        purchasedHints={purchasedTileHints}
        score={teamState.gameState.score ?? 0}
        disabled={solveDisabled}
        isPending={isPending || isHintPending}
        canUnlockGps={isNavigator}
        effectiveBeta={playerSession.effectiveBeta}
        soloAlpha={soloAlpha}
        gpsCapability={eventContent.capabilities.gps}
        levelStartedAt={levelStartedAt}
        teamStartedAt={teamState.startedAt}
        onSubmit={handleSolveLevel}
        onPurchaseHint={handlePurchaseHint}
        feedback={solveFeedback}
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
    <GridError
      message={
        eventContent.levels.length === 0
          ? "Level-Inhalt konnte nicht geladen werden — das Spiel hat keine veröffentlichten Aufgaben."
          : `Level ${activeLevel} fehlt im Content (verfügbar: ${eventContent.levels
              .map((l) => l.level)
              .join(", ")}). Bitte Spiel neu veröffentlichen und neues Live-Event starten.`
      }
    />
  );

  if (phased && usesMissionShell(eventContent)) {
    return (
      <>
        <CityPlayShell mode={eventContent.contentMode}>
          {playBody}
          {realtimeError ? (
            <div className="px-4 pb-4">
              <GridError message={realtimeError} />
            </div>
          ) : null}
          {error ? (
            <div className="px-4 pb-4">
              <GridError message={error} />
            </div>
          ) : null}
        </CityPlayShell>
        {modal && !sessionSuperseded ? (
          <SyncModal modal={modal} onDismiss={handleDismissModal} isPending={isPending} />
        ) : null}
      </>
    );
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
        {!sessionSuperseded && !isFinished ? (
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
        ) : null}
        {playBody}
        {realtimeError ? <GridError message={realtimeError} /> : null}
        {error ? <GridError message={error} /> : null}
      </div>
      {modal && !sessionSuperseded ? (
        <SyncModal modal={modal} onDismiss={handleDismissModal} isPending={isPending} />
      ) : null}
    </>
  );
}
