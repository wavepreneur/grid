"use client";

import { useEffect } from "react";
import { ExitmaniaLevelView } from "@/components/game/exitmania-level-view";
import { CityStatusHud } from "@/components/game/city/status-hud";
import { CityTeamBar } from "@/components/game/city/team-bar";
import { PlayBonusView } from "@/components/game/play-bonus-view";
import { PlayHubView } from "@/components/game/play-hub-view";
import {
  PauseBanner,
  PlayMoreSheet,
  PlayMoreTrigger,
  type PlayMorePanel,
} from "@/components/game/play-more-sheet";
import { PlayQuizView } from "@/components/game/play-quiz-view";
import { isBonusForRole, resolveBonusTask, roleLabelDe } from "@/lib/grid/bonus";
import type { PurchasedTileHint, TeamGameState } from "@/lib/grid/game-state";
import type {
  GeolocationSample,
  LevelDefinition,
  ResolvedEventContent,
  SolveLevelPayload,
} from "@/lib/grid/level-types";
import { buildPlaySlot, missionFromLevel } from "@/lib/grid/play-slots";
import type { SolveFeedbackState } from "@/components/game/solve-feedback-banner";

type Teammate = { id: string; name: string; roleLabel: string };

type Props = {
  eventContent: ResolvedEventContent;
  gameState: TeamGameState;
  activeLevel: number;
  teamName: string;
  myName: string;
  myPlayerId?: string | null;
  myRole: string;
  myRoleLabel: string;
  timeLabel: string;
  purchasedHints: Record<string, PurchasedTileHint>;
  score: number;
  disabled: boolean;
  isPending: boolean;
  canUnlockGps: boolean;
  effectiveBeta: boolean;
  soloAlpha?: boolean;
  levelStartedAt?: string | null;
  teamStartedAt?: string | null;
  solveFeedback?: SolveFeedbackState | null;
  walkStorageKey?: string | null;
  morePanel: PlayMorePanel;
  onMorePanel: (panel: PlayMorePanel) => void;
  paused: boolean;
  onTogglePause: () => void;
  isAlpha: boolean;
  teammates: Teammate[];
  onTransferAlpha?: (playerId: string) => void;
  transferPending?: boolean;
  onReclaimSession?: () => void;
  onArriveOutdoor: (geolocation: GeolocationSample, targetLevel?: number) => void;
  onSolveGpsCheckpoint: (geolocation: GeolocationSample) => void;
  onOpenStation: (levelNumber: number) => void;
  onSubmitStationCode: (code: string) => void;
  onStartMission: (levelNumber: number) => void;
  onSubmitQuiz: (payload: {
    selectedOptionId?: string;
    selectedOptionIds?: string[];
  }) => void;
  onAdvanceQuizToLevel: () => void;
  onSolveLevel: (payload: SolveLevelPayload) => void;
  onPurchaseHint: (tileId: string) => void;
  onSubmitBonus: (selectedOptionId: string) => void;
  onSkipBonus: () => void;
};

function scrollPlayToTop() {
  if (typeof window === "undefined") return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  const shell = document.querySelector(".cg-screen-shell");
  if (shell instanceof HTMLElement) shell.scrollTop = 0;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function PlayPhaseFlow({
  eventContent,
  gameState,
  activeLevel,
  teamName,
  myName,
  myPlayerId = null,
  myRole,
  myRoleLabel,
  timeLabel,
  purchasedHints,
  score,
  disabled,
  isPending,
  canUnlockGps,
  effectiveBeta,
  soloAlpha,
  levelStartedAt,
  teamStartedAt,
  solveFeedback = null,
  walkStorageKey = null,
  morePanel,
  onMorePanel,
  paused,
  onTogglePause,
  isAlpha,
  teammates,
  onTransferAlpha,
  transferPending,
  onReclaimSession,
  onArriveOutdoor,
  onSolveGpsCheckpoint,
  onOpenStation,
  onSubmitStationCode,
  onStartMission,
  onSubmitQuiz,
  onAdvanceQuizToLevel,
  onSolveLevel,
  onPurchaseHint,
  onSubmitBonus,
  onSkipBonus,
}: Props) {
  const mode = eventContent.contentMode;
  const phase = gameState.current_phase ?? "level";
  const level = eventContent.levels.find((l) => l.level === activeLevel);
  const slot = level ? buildPlaySlot(level, mode, phase) : null;
  const completed = Object.values(gameState.levels).filter((e) => e.status === "completed").length;
  const total = eventContent.levels.length;

  // Hub only: map / walk ring / mission picker. Inside a task the chrome is a distraction.
  const showChrome = phase === "hub" || !level || !slot;

  useEffect(() => {
    scrollPlayToTop();
    const t = window.setTimeout(scrollPlayToTop, 50);
    return () => window.clearTimeout(t);
  }, [phase, activeLevel]);

  const chrome = showChrome ? (
    <div className="space-y-2.5 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:space-y-3 sm:pb-3 sm:pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <CityTeamBar teamName={teamName} meName={myName} meRoleLabel={myRoleLabel} compact />
        </div>
        <PlayMoreTrigger onClick={() => onMorePanel("menu")} />
      </div>
      <CityStatusHud
        mode={mode}
        completed={completed}
        total={total}
        timeLabel={paused ? "Pause" : timeLabel}
        score={score}
      />
    </div>
  ) : (
    // Minimal escape hatch while solving — no stats, no team chrome.
    <div className="flex justify-end px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1">
      <PlayMoreTrigger onClick={() => onMorePanel("menu")} />
    </div>
  );

  const sheets = (
    <>
      {paused ? <PauseBanner onResume={onTogglePause} /> : null}
      <PlayMoreSheet
        open={morePanel}
        onOpen={onMorePanel}
        onClose={() => onMorePanel(null)}
        briefingText={eventContent.briefingText}
        crispWebsiteId={process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID}
        paused={paused}
        onTogglePause={onTogglePause}
        isAlpha={isAlpha}
        teammates={teammates}
        onTransferAlpha={onTransferAlpha}
        transferPending={transferPending}
        onReclaimSession={onReclaimSession}
      />
    </>
  );

  if (phase === "bonus" && level) {
    const bonus = resolveBonusTask(level);
    if (bonus) {
      return (
        <>
          {chrome}
          {sheets}
          <PlayBonusView
            bonus={bonus}
            mode={mode}
            isMine={isBonusForRole(bonus, myRole)}
            myName={myName}
            myRoleLabel={myRoleLabel}
            teamName={teamName}
            waitingRoleLabel={roleLabelDe(bonus.for_role)}
            disabled={disabled}
            isPending={isPending}
            onSubmit={onSubmitBonus}
            onSkipWaiting={onSkipBonus}
          />
        </>
      );
    }
  }

  if (phase === "hub" || !level || !slot) {
    return (
      <>
        {chrome}
        {sheets}
        <PlayHubView
          mode={mode}
          levels={eventContent.levels}
          levelStatuses={gameState.levels}
          activeLevel={activeLevel}
          routeOrder={eventContent.routeOrder ?? "linear"}
          canUnlockGps={canUnlockGps}
          disabled={disabled || paused}
          isPending={isPending}
          walkStorageKey={walkStorageKey}
          onArriveOutdoor={onArriveOutdoor}
          onSolveGpsCheckpoint={onSolveGpsCheckpoint}
          onOpenStation={onOpenStation}
          onSubmitStationCode={onSubmitStationCode}
          onStartMission={onStartMission}
        />
      </>
    );
  }

  if (phase === "quiz" && slot.quiz) {
    return (
      <>
        {chrome}
        {sheets}
        <PlayQuizView
          title={level.title}
          spotLabel={
            mode === "indoor"
              ? "Station geöffnet"
              : mode === "online"
                ? "Mission gestartet · alle gleichzeitig"
                : "Wegpunkt erreicht"
          }
          mode={mode}
          quiz={slot.quiz}
          disabled={disabled || paused}
          isPending={isPending}
          teamReveal={gameState.quiz_reveal}
          onSubmit={onSubmitQuiz}
          onAdvanceToLevel={onAdvanceQuizToLevel}
        />
      </>
    );
  }

  const mission: LevelDefinition = missionFromLevel(level);

  return (
    <>
      {chrome}
      {sheets}
      <div className="px-4 pb-[max(1.5rem,calc(0.75rem+env(safe-area-inset-bottom)))]">
        <ExitmaniaLevelView
          level={mission}
          allLevels={eventContent.levels}
          levelStatuses={gameState.levels}
          purchasedHints={purchasedHints}
          score={score}
          disabled={disabled || paused}
          isPending={isPending}
          canUnlockGps={canUnlockGps}
          effectiveBeta={effectiveBeta}
          soloAlpha={soloAlpha}
          gpsCapability={mode === "outdoor" && mission.type === "gps"}
          levelStartedAt={levelStartedAt}
          teamStartedAt={teamStartedAt}
          myPlayerId={myPlayerId}
          onSubmit={onSolveLevel}
          onPurchaseHint={onPurchaseHint}
          feedback={solveFeedback}
        />
      </div>
    </>
  );
}
