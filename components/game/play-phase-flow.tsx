"use client";

import { useEffect, useRef, useState } from "react";
import { ExitmaniaLevelView } from "@/components/game/exitmania-level-view";
import { BonusCompleteToast } from "@/components/game/bonus-complete-toast";
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
import { PlayTransitionScreen } from "@/components/game/play-transition-screen";
import { isBonusForRole, resolveBonusTask } from "@/lib/grid/bonus";
import type { PurchasedTileHint, TeamGameState } from "@/lib/grid/game-state";
import type {
  GeolocationSample,
  LevelDefinition,
  ResolvedEventContent,
  SolveLevelPayload,
} from "@/lib/grid/level-types";
import { buildPlaySlot, missionFromLevel } from "@/lib/grid/play-slots";
import {
  bonusAudienceHeadline,
  DEFAULT_ROLE_LABELS,
  type RoleDisplayLabels,
} from "@/lib/grid/role-labels";
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
  onReleasePlayerSeat?: (playerId: string) => void;
  transferPending?: boolean;
  onReclaimSession?: () => void;
  onReleaseMySeat?: () => void;
  releasePending?: boolean;
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
  onReleasePlayerSeat,
  transferPending,
  onReclaimSession,
  onReleaseMySeat,
  releasePending,
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
  const roleLabels: RoleDisplayLabels = eventContent.roleLabels ?? DEFAULT_ROLE_LABELS;

  const prevPhaseRef = useRef(phase);
  const [unlockGate, setUnlockGate] = useState(false);

  // After quiz → level: short key-unlock interstitial on every device.
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev === "quiz" && phase === "level") {
      setUnlockGate(true);
    }
  }, [phase]);

  // Hub only: map / walk ring / mission picker. Inside a task the chrome is a distraction.
  const showChrome = phase === "hub" || !level || !slot;

  useEffect(() => {
    scrollPlayToTop();
    const t = window.setTimeout(scrollPlayToTop, 50);
    return () => window.clearTimeout(t);
  }, [phase, activeLevel, unlockGate]);

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
        briefingIframeUrl={eventContent.briefingIframeUrl}
        faqIframeUrl={eventContent.faqIframeUrl}
        crispWebsiteId={process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID}
        paused={paused}
        onTogglePause={onTogglePause}
        isAlpha={isAlpha}
        teammates={teammates}
        onTransferAlpha={onTransferAlpha}
        onReleasePlayerSeat={onReleasePlayerSeat}
        transferPending={transferPending}
        onReclaimSession={onReclaimSession}
        onReleaseMySeat={onReleaseMySeat}
        releasePending={releasePending}
      />
      <BonusCompleteToast notice={gameState.bonus_notice} />
    </>
  );

  // Asymmetric role bonus: assignee sees overlay; others keep playing the hub.
  const activeBonus = gameState.active_bonus;
  if (activeBonus && !activeBonus.for_team) {
    const bonusLevel = eventContent.levels.find((l) => l.level === activeBonus.from_level);
    const bonus = bonusLevel ? resolveBonusTask(bonusLevel) : null;
    if (bonus && isBonusForRole(bonus, myRole)) {
      return (
        <>
          {sheets}
          <PlayBonusView
            bonus={bonus}
            mode={mode}
            isMine
            myName={myName}
            myRoleLabel={myRoleLabel}
            teamName={teamName}
            roleLabels={roleLabels}
            asymmetricOverlay
            disabled={disabled}
            isPending={isPending}
            onSubmit={onSubmitBonus}
            onSkipWaiting={onSkipBonus}
          />
        </>
      );
    }
  }

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
            roleLabels={roleLabels}
            disabled={disabled}
            isPending={isPending}
            onSubmit={onSubmitBonus}
            onSkipWaiting={onSkipBonus}
          />
        </>
      );
    }
  }

  if (unlockGate && phase === "level") {
    return (
      <>
        {sheets}
        <PlayTransitionScreen
          kind="unlock"
          title="Der Schlüssel öffnet das Level"
          subtitle="Ihr seid zurück im Spiel — jetzt kommt die eigentliche Aufgabe."
          audienceIcons={3}
          autoMs={2200}
          onDone={() => setUnlockGate(false)}
        />
      </>
    );
  }

  if (phase === "hub" || !level || !slot) {
    const pendingRoleHint =
      activeBonus && !activeBonus.for_team
        ? bonusAudienceHeadline(
            { for_role: activeBonus.for_role, for_team: false },
            roleLabels,
          )
        : null;

    return (
      <>
        {chrome}
        {sheets}
        {pendingRoleHint ? (
          <p className="px-4 pb-2 text-center text-xs font-semibold text-[var(--cg-muted)]">
            Bonus läuft bei {pendingRoleHint} — ihr könnt weiter.
          </p>
        ) : null}
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
