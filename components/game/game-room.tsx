"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  advanceFromHub,
  dismissBonusNotice,
  dismissSyncModal,
  getGameState,
  purchaseHint,
  skipBonusPhase,
  beginBonusPresentation,
  advanceBonusAfterReveal,
  solveCurrentLevel,
  submitArrivalQuiz,
  advanceQuizToLevel,
  submitBonusAnswer,
  syncOutdoorWalkProgress,
} from "@/app/actions/game";
import { usesMissionShell } from "@/lib/grid/blueprints";
import { CityPlayShell } from "@/components/game/city/play-shell";
import { BigButton } from "@/components/game/city/ui";
import { BonusCompleteToast } from "@/components/game/bonus-complete-toast";
import { ExitmaniaLevelView } from "@/components/game/exitmania-level-view";
import { GameHud } from "@/components/game/game-hud";
import { LevelPanel } from "@/components/game/level-panel";
import { PlayPhaseFlow } from "@/components/game/play-phase-flow";
import type { OutdoorArriveInput } from "@/components/game/play-hub-view";
import type { PlayMorePanel } from "@/components/game/play-more-sheet";
import { SyncModal } from "@/components/game/sync-modal";
import type { SolveFeedbackState } from "@/components/game/solve-feedback-banner";
import { IdentityBar } from "@/components/player/identity-bar";
import { SessionHandoffScreen } from "@/components/player/session-handoff-screen";
import { GridError } from "@/components/grid/grid-shell";
import { cockpitShowPath, eventTeamJoinPath } from "@/lib/grid/event-routes";
import { transferCaptain, handoverSession, removePlayerFromLobby } from "@/app/actions/lobby";
import { useTeamSync } from "@/lib/hooks/use-team-sync";
import { useMissionCountdown } from "@/lib/hooks/use-mission-countdown";
import { cacheTeamState, readLocalPaused, writeLocalPaused, pauseStorageKey } from "@/lib/grid/offline-state";
import { displayRoleLabel, DEFAULT_ROLE_LABELS } from "@/lib/grid/role-labels";
import { useBonusQueueTick } from "@/lib/hooks/use-bonus-queue-tick";
import { clearWalkedDistanceStorage } from "@/lib/hooks/use-walked-distance";
import type { TeamGameState, TeamRealtimeState } from "@/lib/grid/game-state";
import type {
  ResolvedEventContent,
  SolveLevelPayload,
} from "@/lib/grid/level-types";
import { applyCaptainTransferToPlayers, applyRosterToSession, rosterWithHeldCaptain, sessionAfterCaptainTransfer } from "@/lib/grid/live-session";
import { nextLeadSeq, noteLeadSeq, parseLeadSeq } from "@/lib/grid/lead-seq";
import { clearPlayerSession, savePlayerSession } from "@/lib/grid/player-session";
import type { LobbyPlayer, PlayerSession } from "@/lib/grid/types";
import { usesPhasedPlay } from "@/lib/grid/play-slots";
import { playPlaySfx, unlockPlayAudio } from "@/lib/grid/play-sfx";
import { useRouter } from "next/navigation";

type GameRoomProps = {
  inviteCode: string;
  joinCode: string;
  session: PlayerSession;
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
  session: initialSession,
  initialState,
  eventContent,
  teamName,
  eventTitle = "Mission",
}: GameRoomProps) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [teamState, setTeamState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [solveFeedback, setSolveFeedback] = useState<SolveFeedbackState | null>(null);
  const [sessionSuperseded, setSessionSuperseded] = useState(false);
  const [isPending, startTransition] = useTransition();
  /** Only user solve/submit actions — never Realtime resync (that was flipping OK ↔ Sende…). */
  const [isSolvePending, startSolveTransition] = useTransition();
  const [isHintPending, startHintTransition] = useTransition();
  const [morePanel, setMorePanel] = useState<PlayMorePanel>(null);
  const [paused, setPaused] = useState(false);
  const [transferPending, setTransferPending] = useState(false);
  const [releasePending, setReleasePending] = useState(false);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const holdCaptainIdRef = useRef<string | null>(null);
  const holdSeqRef = useRef(0);

  function applyHeldLead(playerId: string, seq: number): boolean {
    if (seq < holdSeqRef.current) return false;
    noteLeadSeq(seq);
    holdSeqRef.current = seq;
    holdCaptainIdRef.current = playerId;
    return true;
  }

  function applyLeadToUi(playerId: string) {
    setLobbyPlayers((current) => applyCaptainTransferToPlayers(current, playerId));
    setSession((current) => {
      const next = sessionAfterCaptainTransfer(current, playerId);
      savePlayerSession(next);
      return next;
    });
  }

  const localPauseKey = pauseStorageKey({
    inviteCode,
    joinCode,
    playerId: session.playerId,
  });

  // Restore device-local pause after app close / URL reopen.
  useEffect(() => {
    if (teamState.status === "finished") {
      writeLocalPaused(localPauseKey, false);
      return;
    }
    if (!readLocalPaused(localPauseKey)) return;
    setPaused(true);
    setMorePanel("pause");
  }, [localPauseKey, teamState.status]);

  function handleTogglePause() {
    setPaused((prev) => {
      const next = !prev;
      writeLocalPaused(localPauseKey, next);
      return next;
    });
  }

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

  const handleResynced = useCallback(() => {
    // Background pull — must not touch solve isPending (desktop reconnect spam).
    void getGameState({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
    }).then((result) => {
      if (!result.success) return;
      setTeamState(result.data);
      cacheTeamState(result.data);
    });
  }, [inviteCode, joinCode, session.sessionId]);

  const { isConnected, statusHint: realtimeHint, error: realtimeError, broadcast } = useTeamSync({
    sessionId: session.sessionId,
    teamId: session.teamId,
    playerId: session.playerId,
    enabled: !sessionSuperseded,
    surface: "play",
    onGameStateChange: handleStateUpdate,
    onTeamStatusChange: handleTeamStatusChange,
    onSessionSuperseded: () => setSessionSuperseded(true),
    onPlayersChange: (players) => {
      const heldId = holdCaptainIdRef.current;
      const nextPlayers = rosterWithHeldCaptain(players, heldId);
      setLobbyPlayers(nextPlayers);
      const me = nextPlayers.find((player) => player.id === session.playerId);
      if (!me) return;
      setSession((current) => {
        const next = applyRosterToSession(current, me);
        if (next !== current) savePlayerSession(next);
        return next;
      });
    },
    onSyncEvent: (event) => {
      if (event.event_type === "captain_transferred") {
        const newCaptainId = String(event.payload.new_captain_id ?? "");
        if (!newCaptainId) return;
        const seq = parseLeadSeq(event.payload.seq);
        if (!seq) {
          if (holdCaptainIdRef.current) return;
          if (!applyHeldLead(newCaptainId, nextLeadSeq())) return;
        } else if (!applyHeldLead(newCaptainId, seq)) {
          return;
        }
        applyLeadToUi(newCaptainId);
        return;
      }
      handleResynced();
    },
    onResynced: handleResynced,
  });

  const activeLevel = Number(teamState.currentLevel) || 1;
  const levelState = teamState.gameState.levels[String(activeLevel)];
  const levelStartedAt = levelState?.started_at ?? null;
  const isFinished = teamState.status === "finished";
  const modal = teamState.gameState.modal;
  const walkStorageKey = `grid:walk:${inviteCode}:${joinCode}`;

  useBonusQueueTick({
    inviteCode,
    joinCode,
    sessionId: session.sessionId,
    gameState: teamState.gameState,
    walkStorageKey,
    enabled: !sessionSuperseded && !isFinished,
    // One tracker device (Alpha/GPS lead) — avoids split meter counters across phones.
    trackMeters: session.canUnlockGps,
    onState: (state) => {
      setTeamState(state);
      cacheTeamState(state);
    },
  });

  const completedLevels = useMemo(
    () => countCompletedLevels(teamState.gameState),
    [teamState.gameState],
  );

  const playPhase = teamState.gameState.current_phase ?? "level";

  useEffect(() => {
    setSolveFeedback(null);
  }, [activeLevel, playPhase]);

  // Correct burst is momentary — never leave it under an empty form.
  useEffect(() => {
    if (solveFeedback?.kind !== "correct") return;
    const timer = window.setTimeout(() => setSolveFeedback(null), 1600);
    return () => window.clearTimeout(timer);
  }, [solveFeedback]);

  useEffect(() => {
    const unlock = () => unlockPlayAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!isFinished) return;
    playPlaySfx("complete");
  }, [isFinished]);

  const currentLevelDefinition =
    eventContent.levels.find((level) => Number(level.level) === activeLevel) ??
    (eventContent.levels.length === 1 ? eventContent.levels[0] : null);
  const isNavigator = session.canUnlockGps || Boolean(teamState.isNavigator);
  const soloAlpha = session.isAlpha && session.effectiveBeta;
  const purchasedTileHints = teamState.gameState.purchased_tile_hints[String(activeLevel)] ?? {};
  const solveDisabled = levelState?.status !== "active" || Boolean(modal) || isHintPending;

  function handlePurchaseHint(tileId: string) {
    setError(null);
    startHintTransition(async () => {
      const result = await purchaseHint({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
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
          score: result.data!.score,
          purchased_tile_hints: {
            ...current.gameState.purchased_tile_hints,
            [levelKey]: {
              ...(current.gameState.purchased_tile_hints[levelKey] ?? {}),
              [tileId]: {
                text: result.data!.hintText,
                cost: result.data!.cost,
                unlocked_by: result.data!.unlockedBy,
                unlocked_by_player_id: result.data!.unlockedByPlayerId,
                unlocked_at: result.data!.unlockedAt,
              },
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
    startSolveTransition(async () => {
      const result = await solveCurrentLevel({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
        payload,
      });
      if (!result.success) {
        const answerRejected = /Falsche Antwort|Bitte eine Antwort|Bitte alle richtigen|Nicht alle richtigen/i.test(
          result.error,
        );
        setSolveFeedback({
          id: Date.now(),
          kind: "wrong",
          message: result.error,
          attemptedAnswer: answerRejected ? attemptedAnswer : null,
        });
        if (!answerRejected) {
          void getGameState({
            inviteCode,
            joinCode,
            sessionId: session.sessionId,
          }).then((fresh) => {
            if (!fresh.success) return;
            setTeamState(fresh.data);
            cacheTeamState(fresh.data);
          });
        }
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
    if (!result.success) {
      setError(result.error ?? "Aktion fehlgeschlagen.");
      return;
    }
    if (!result.data) {
      setError("Aktion fehlgeschlagen.");
      return;
    }
    setTeamState(result.data);
    cacheTeamState(result.data);
  }

  function handleArriveOutdoor(input: OutdoorArriveInput) {
    setError(null);
    startSolveTransition(async () => {
      const result = await advanceFromHub({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
        geolocation: input.geolocation,
        targetLevel: input.targetLevel,
        walkedMeters: input.walkedMeters,
        forceUnlock: input.forceUnlock,
      });
      if (!result.success) {
        setError(result.error ?? "Aktion fehlgeschlagen.");
        return;
      }
      if (!result.data) {
        setError("Aktion fehlgeschlagen.");
        return;
      }
      const levelKey = input.targetLevel ?? activeLevel;
      clearWalkedDistanceStorage(`grid:walk:${inviteCode}:${joinCode}:L${levelKey}`);
      setTeamState(result.data);
      cacheTeamState(result.data);
    });
  }

  function handleSolveGpsCheckpoint(input: OutdoorArriveInput) {
    handleSolveLevel({
      geolocation: input.geolocation,
      forceUnlock: input.forceUnlock,
    });
  }

  function handleReportWalkProgress(level: number, walkedMeters: number) {
    void syncOutdoorWalkProgress({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
      level,
      walkedMeters,
    }).then((result) => {
      if (result.success && result.data) {
        setTeamState(result.data);
        cacheTeamState(result.data);
      }
    });
  }

  function handleOpenStation(levelNumber: number) {
    setError(null);
    startSolveTransition(async () => {
      applyTeamResult(
        await advanceFromHub({
          inviteCode,
          joinCode,
          sessionId: session.sessionId,
          targetLevel: levelNumber,
        }),
      );
    });
  }

  function handleSubmitStationCode(code: string) {
    setError(null);
    startSolveTransition(async () => {
      applyTeamResult(
        await advanceFromHub({
          inviteCode,
          joinCode,
          sessionId: session.sessionId,
          stationCode: code,
        }),
      );
    });
  }

  function handleStartMission(levelNumber: number) {
    setError(null);
    startSolveTransition(async () => {
      applyTeamResult(
        await advanceFromHub({
          inviteCode,
          joinCode,
          sessionId: session.sessionId,
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
    startSolveTransition(async () => {
      applyTeamResult(
        await submitArrivalQuiz({
          inviteCode,
          joinCode,
          sessionId: session.sessionId,
          selectedOptionId: payload.selectedOptionId,
          selectedOptionIds: payload.selectedOptionIds,
        }),
      );
    });
  }

  function handleAdvanceQuizToLevel() {
    setError(null);
    startSolveTransition(async () => {
      applyTeamResult(
        await advanceQuizToLevel({
          inviteCode,
          joinCode,
          sessionId: session.sessionId,
        }),
      );
    });
  }

  function handleSubmitBonus(selectedOptionId: string) {
    setError(null);
    startSolveTransition(async () => {
      applyTeamResult(
        await submitBonusAnswer({
          inviteCode,
          joinCode,
          sessionId: session.sessionId,
          selectedOptionId,
        }),
      );
    });
  }

  function handleBeginBonus(bonusId: string) {
    setError(null);
    void beginBonusPresentation({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
      bonusId,
    }).then(applyTeamResult);
  }

  function handleContinueBonus(bonusId: string) {
    setError(null);
    startSolveTransition(async () => {
      applyTeamResult(
        await advanceBonusAfterReveal({
          inviteCode,
          joinCode,
          sessionId: session.sessionId,
          bonusId,
        }),
      );
    });
  }

  function handleSkipBonus() {
    setError(null);
    startSolveTransition(async () => {
      applyTeamResult(
        await skipBonusPhase({
          inviteCode,
          joinCode,
          sessionId: session.sessionId,
        }),
      );
    });
  }

  function handleDismissBonusNotice(noticeId: string) {
    // Optimistic clear so phase remounts cannot resurrect the toast.
    setTeamState((current) => {
      if (current.gameState.bonus_notice?.id !== noticeId) return current;
      const next: TeamRealtimeState = {
        ...current,
        gameState: {
          ...current.gameState,
          version: current.gameState.version + 1,
          bonus_notice: null,
        },
      };
      cacheTeamState(next);
      return next;
    });
    void dismissBonusNotice({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
      noticeId,
    }).then((result) => {
      if (result.success && result.data) {
        setTeamState(result.data);
        cacheTeamState(result.data);
      }
    });
  }

  const phased = usesPhasedPlay(eventContent);
  const { remainingLabel } = useMissionCountdown(
    teamState.startedAt,
    eventContent.missionDurationMinutes,
    paused,
  );
  const isAlpha = session.isAlpha;

  function handleTransferAlpha(targetPlayerId: string) {
    setTransferPending(true);
    setError(null);
    setMorePanel(null);
    const seq = nextLeadSeq();
    if (!applyHeldLead(targetPlayerId, seq)) {
      setTransferPending(false);
      return;
    }
    applyLeadToUi(targetPlayerId);
    setTransferPending(false);

    void broadcast({
      type: "captain_transferred",
      new_captain_id: targetPlayerId,
      previous_captain_id: session.playerId,
      seq,
    });

    void transferCaptain({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
      targetPlayerId,
      seq,
    }).then((result) => {
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!applyHeldLead(result.data.newCaptainId, result.data.seq)) return;
      if (result.data.newCaptainId !== targetPlayerId) {
        applyLeadToUi(result.data.newCaptainId);
      }
    });
  }

  function handleReleasePlayerSeat(targetPlayerId: string) {
    setReleasePending(true);
    startTransition(async () => {
      const result = await removePlayerFromLobby({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
        targetPlayerId,
      });
      setReleasePending(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
    });
  }

  function handleReleaseMySeat() {
    setReleasePending(true);
    startTransition(async () => {
      const result = await handoverSession({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
      });
      setReleasePending(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      clearPlayerSession();
      clearWalkedDistanceStorage(walkStorageKey);
      router.replace(eventTeamJoinPath(inviteCode, joinCode));
    });
  }

  function handleDismissModal() {
    if (!modal) return;
    startTransition(async () => {
      const result = await dismissSyncModal({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
        modalId: modal.id,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setTeamState(result.data);
      cacheTeamState(result.data);
      // Land on hub/next view at the top — not mid-form from prior focus.
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        const shell = document.querySelector(".cg-screen-shell");
        if (shell instanceof HTMLElement) shell.scrollTop = 0;
      });
    });
  }

  const playBody = sessionSuperseded ? (
    <SessionHandoffScreen
      inviteCode={inviteCode}
      joinCode={joinCode}
      playerId={session.playerId}
      displayName={session.displayName}
    />
  ) : isFinished ? (
    <div className="cg-animate-rise-in space-y-6 px-5 pb-[max(2.5rem,calc(1.25rem+env(safe-area-inset-bottom)))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="space-y-2 text-center">
        <span
          aria-hidden
          className="cg-animate-celebrate mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--cg-success)] text-4xl text-white shadow-[var(--cg-shadow-lift)]"
        >
          ✓
        </span>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--cg-muted)]">
          Game Over
        </p>
        <p className="cg-animate-pop-in text-3xl font-bold text-[var(--cg-fg)]">
          Mission abgeschlossen!
        </p>
        <p className="text-base text-[var(--cg-muted)]">
          {teamName} · {eventContent.levels.length} Aufgaben
        </p>
      </div>
      <div className="cg-animate-pop-in rounded-3xl border-2 border-[var(--cg-success)]/35 bg-[var(--cg-card)] px-5 py-6 text-center shadow-[var(--cg-shadow-lift)]">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--cg-muted)]">
          Eure Punkte
        </p>
        <p className="cg-animate-score-pop mt-2 text-5xl font-extrabold tabular-nums text-[var(--cg-fg)]">
          {teamState.gameState.score ?? 0}
        </p>
      </div>
      {eventContent.showLiveScore ? (
        <Link href={cockpitShowPath(inviteCode)} className="block">
          <BigButton variant="accent">Ranking ansehen</BigButton>
        </Link>
      ) : (
        <p className="text-center text-sm text-[var(--cg-muted)]">
          Live-Ranking ist für dieses Event ausgeschaltet.
        </p>
      )}
    </div>
  ) : currentLevelDefinition ? (
    phased && usesMissionShell(eventContent) ? (
      <PlayPhaseFlow
        eventContent={eventContent}
        gameState={teamState.gameState}
        activeLevel={activeLevel}
        teamName={teamName}
        myName={session.displayName}
        myPlayerId={session.playerId}
        myRole={session.archetypeRole}
        myRoleLabel={displayRoleLabel(
          session.archetypeRole,
          eventContent.roleLabels ?? DEFAULT_ROLE_LABELS,
        )}
        timeLabel={remainingLabel}
        purchasedHints={purchasedTileHints}
        score={teamState.gameState.score ?? 0}
        disabled={solveDisabled && teamState.gameState.current_phase !== "bonus"}
        isPending={isSolvePending || isHintPending}
        canUnlockGps={isNavigator}
        effectiveBeta={session.effectiveBeta}
        soloAlpha={soloAlpha}
        levelStartedAt={levelStartedAt}
        teamStartedAt={teamState.startedAt}
        solveFeedback={solveFeedback}
        walkStorageKey={walkStorageKey}
        morePanel={morePanel}
        onMorePanel={setMorePanel}
        paused={paused}
        onTogglePause={handleTogglePause}
        isAlpha={isAlpha}
        teammates={lobbyPlayers
          .filter((p) => p.id !== session.playerId)
          .map((p) => {
            const role =
              p.archetype_role ??
              (p.is_alpha || p.is_captain
                ? "alpha"
                : p.is_beta
                  ? "beta"
                  : "gamma");
            return {
              id: p.id,
              name: p.display_name,
              role,
              roleLabel: displayRoleLabel(
                role,
                eventContent.roleLabels ?? DEFAULT_ROLE_LABELS,
              ),
            };
          })}
        roster={lobbyPlayers.map((p) => {
          const role =
            p.archetype_role ??
            (p.is_alpha || p.is_captain
              ? "alpha"
              : p.is_beta
                ? "beta"
                : "gamma");
          return {
            id: p.id,
            name: p.display_name,
            role,
            roleLabel: displayRoleLabel(
              role,
              eventContent.roleLabels ?? DEFAULT_ROLE_LABELS,
            ),
            isMe: p.id === session.playerId,
          };
        })}
        inviteCode={inviteCode}
        joinCode={joinCode}
        sessionId={session.sessionId}
        onTransferAlpha={handleTransferAlpha}
        onReleasePlayerSeat={isAlpha ? handleReleasePlayerSeat : undefined}
        transferPending={transferPending}
        onReclaimSession={() => setSessionSuperseded(true)}
        onReleaseMySeat={handleReleaseMySeat}
        releasePending={releasePending}
        onArriveOutdoor={handleArriveOutdoor}
        onSolveGpsCheckpoint={handleSolveGpsCheckpoint}
        onReportWalkProgress={handleReportWalkProgress}
        onOpenStation={handleOpenStation}
        onSubmitStationCode={handleSubmitStationCode}
        onStartMission={handleStartMission}
        onSubmitQuiz={handleSubmitQuiz}
        onAdvanceQuizToLevel={handleAdvanceQuizToLevel}
        onSolveLevel={handleSolveLevel}
        onPurchaseHint={handlePurchaseHint}
        onSubmitBonus={handleSubmitBonus}
        onBeginBonus={handleBeginBonus}
        onContinueBonus={handleContinueBonus}
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
        isPending={isSolvePending || isHintPending}
        canUnlockGps={isNavigator}
        effectiveBeta={session.effectiveBeta}
        soloAlpha={soloAlpha}
        gpsCapability={eventContent.capabilities.gps}
        levelStartedAt={levelStartedAt}
        teamStartedAt={teamState.startedAt}
        myPlayerId={session.playerId}
        onSubmit={handleSolveLevel}
        onPurchaseHint={handlePurchaseHint}
        feedback={solveFeedback}
      />
    ) : (
      <LevelPanel
        level={currentLevelDefinition}
        disabled={solveDisabled}
        isPending={isSolvePending}
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
          {realtimeHint ? (
            <p className="px-4 pb-2 text-center text-xs text-[var(--cg-muted)]">
              {realtimeHint}
            </p>
          ) : null}
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
        <BonusCompleteToast
          notice={teamState.gameState.bonus_notice}
          onDismiss={handleDismissBonusNotice}
        />
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
          session={session}
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
        {realtimeHint ? (
          <p className="text-center text-xs text-slate-500">{realtimeHint}</p>
        ) : null}
        {realtimeError ? <GridError message={realtimeError} /> : null}
        {error ? <GridError message={error} /> : null}
      </div>
      {modal && !sessionSuperseded ? (
        <SyncModal modal={modal} onDismiss={handleDismissModal} isPending={isPending} />
      ) : null}
    </>
  );
}
