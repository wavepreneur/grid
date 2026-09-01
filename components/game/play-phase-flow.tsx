"use client";

import { useEffect, useRef, useState } from "react";
import { ExitmaniaLevelView } from "@/components/game/exitmania-level-view";
import { CityStatusHud } from "@/components/game/city/status-hud";
import { CityTeamBar } from "@/components/game/city/team-bar";
import { BonusSpectatorView } from "@/components/game/bonus-spectator-view";
import { PlayBonusView } from "@/components/game/play-bonus-view";
import { PlayHubView, type OutdoorArriveInput } from "@/components/game/play-hub-view";
import {
  PauseBanner,
  PlayMoreSheet,
  PlayMoreTrigger,
  type PlayMorePanel,
} from "@/components/game/play-more-sheet";
import { PlayQuizView } from "@/components/game/play-quiz-view";
import { PlayTransitionScreen } from "@/components/game/play-transition-screen";
import { canPresentBonus, resolveBonusForPlay } from "@/lib/grid/bonus";
import {
  findForeignActiveBonuses,
  findPresentableBonusForRole,
} from "@/lib/grid/bonus-queue";
import type { PurchasedTileHint, TeamGameState } from "@/lib/grid/game-state";
import type {
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

type Teammate = {
  id: string;
  name: string;
  roleLabel: string;
  role?: string;
};

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
  roster?: Array<Teammate & { isMe?: boolean }>;
  inviteCode?: string;
  joinCode?: string;
  sessionId?: string;
  onTransferAlpha?: (playerId: string) => void;
  onReleasePlayerSeat?: (playerId: string) => void;
  transferPending?: boolean;
  onReclaimSession?: () => void;
  onReleaseMySeat?: () => void;
  releasePending?: boolean;
  onArriveOutdoor: (input: OutdoorArriveInput) => void;
  onSolveGpsCheckpoint: (input: OutdoorArriveInput) => void;
  onReportWalkProgress?: (level: number, walkedMeters: number) => void;
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
  onBeginBonus: (bonusId: string) => void;
  onContinueBonus: (bonusId: string) => void;
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
  roster,
  inviteCode,
  joinCode,
  sessionId,
  onTransferAlpha,
  onReleasePlayerSeat,
  transferPending,
  onReclaimSession,
  onReleaseMySeat,
  releasePending,
  onArriveOutdoor,
  onSolveGpsCheckpoint,
  onReportWalkProgress,
  onOpenStation,
  onSubmitStationCode,
  onStartMission,
  onSubmitQuiz,
  onAdvanceQuizToLevel,
  onSolveLevel,
  onPurchaseHint,
  onSubmitBonus,
  onBeginBonus,
  onContinueBonus,
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
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <span className="pointer-events-auto">
        <PlayMoreTrigger onClick={() => onMorePanel("menu")} />
      </span>
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
        roster={roster}
        inviteCode={inviteCode}
        joinCode={joinCode}
        sessionId={sessionId}
        onTransferAlpha={onTransferAlpha}
        onReleasePlayerSeat={onReleasePlayerSeat}
        transferPending={transferPending}
        onReclaimSession={onReclaimSession}
        onReleaseMySeat={onReleaseMySeat}
        releasePending={releasePending}
      />
    </>
  );

  // Active / ready bonus from queue (supports parallel role packs).
  // Solo Alpha claims role-only bonuses so 1-device tests still see Layer 3.
  const claimUnassigned = Boolean(soloAlpha) || (isAlpha && teammates.length === 0);
  const queueBonus = findPresentableBonusForRole(gameState, myRole, { claimUnassigned });
  const overlayBonus = gameState.active_bonus;
  const presentBonusMeta = queueBonus
    ? {
        from_level: queueBonus.from_level,
        bonus_id: queueBonus.bonus_id,
        for_team: queueBonus.for_team,
        snapshot: queueBonus.task_snapshot ?? null,
      }
    : overlayBonus
      ? {
          from_level: overlayBonus.from_level,
          bonus_id: overlayBonus.bonus_id,
          for_team: overlayBonus.for_team,
          snapshot:
            (gameState.bonus_queue ?? []).find((i) => i.bonus_id === overlayBonus.bonus_id)
              ?.task_snapshot ?? null,
        }
      : null;

  if (presentBonusMeta) {
    const bonusLevel = eventContent.levels.find((l) => l.level === presentBonusMeta.from_level);
    const bonus = resolveBonusForPlay(
      bonusLevel,
      presentBonusMeta.bonus_id,
      presentBonusMeta.snapshot,
    );
    if (
      bonus &&
      (presentBonusMeta.for_team || canPresentBonus(bonus, myRole, { claimUnassigned }))
    ) {
      const bonusId = presentBonusMeta.bonus_id ?? `legacy-${presentBonusMeta.from_level}`;
      return (
        <>
          {sheets}
          <PlayBonusView
            key={bonusId}
            bonus={bonus}
            bonusId={bonusId}
            mode={mode}
            isMine
            myName={myName}
            myRoleLabel={myRoleLabel}
            teamName={teamName}
            roleLabels={roleLabels}
            asymmetricOverlay={!presentBonusMeta.for_team}
            disabled={disabled}
            isPending={isPending}
            teamSession={gameState.bonus_sessions?.[bonusId] ?? null}
            onBegin={() => onBeginBonus(bonusId)}
            onSubmit={onSubmitBonus}
            onContinue={() => onContinueBonus(bonusId)}
            onSkipWaiting={onSkipBonus}
          />
        </>
      );
    }
  }

  const foreignBonuses = findForeignActiveBonuses(gameState, myRole, { claimUnassigned });
  if (foreignBonuses.length > 0) {
    return (
      <>
        {sheets}
        <BonusSpectatorView
          items={foreignBonuses.map((item) => ({
            bonusId: item.bonus_id,
            solverName:
              gameState.bonus_sessions?.[item.bonus_id]?.solver_name ||
              roster?.find((p) => p.role === item.for_role)?.name ||
              bonusAudienceHeadline(
                { for_role: item.for_role, for_team: false },
                roleLabels,
              ),
            reveal: gameState.bonus_sessions?.[item.bonus_id]?.reveal ?? null,
          }))}
          teamName={teamName}
          myName={myName}
          myRoleLabel={myRoleLabel}
          isPending={isPending}
          onContinue={onContinueBonus}
        />
      </>
    );
  }

  if (phase === "bonus" && level) {
    const activeItem = gameState.bonus_queue?.find(
      (item) => item.status === "active" && item.from_level === level.level,
    );
    // Only show when a queue item is actually active — never fall back to
    // resolveBonusTask(level) or the same bonus reappears after completion.
    const bonus = resolveBonusForPlay(
      level,
      activeItem?.bonus_id,
      activeItem?.task_snapshot,
    );
    if (bonus && activeItem) {
      const mine = canPresentBonus(bonus, myRole, { claimUnassigned });
      const bonusId = activeItem.bonus_id;
      return (
        <>
          {chrome}
          {sheets}
          <PlayBonusView
            key={bonusId}
            bonus={bonus}
            bonusId={bonusId}
            mode={mode}
            isMine={mine}
            myName={myName}
            myRoleLabel={myRoleLabel}
            teamName={teamName}
            roleLabels={roleLabels}
            disabled={disabled}
            isPending={isPending}
            teamSession={gameState.bonus_sessions?.[bonusId] ?? null}
            onBegin={() => onBeginBonus(bonusId)}
            onSubmit={onSubmitBonus}
            onContinue={() => onContinueBonus(bonusId)}
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
          subtitle="Gleich kommt die eigentliche Aufgabe — kurz warten."
          audienceIcons={3}
          autoMs={5000}
          onDone={() => setUnlockGate(false)}
        />
      </>
    );
  }

  if (phase === "hub" || !level || !slot) {
    const pendingRoleItem = (gameState.bonus_queue ?? []).find(
      (item) =>
        (item.status === "active" || item.status === "ready") && !item.for_team,
    );
    const pendingRoleHint = pendingRoleItem
      ? bonusAudienceHeadline(
          { for_role: pendingRoleItem.for_role, for_team: false },
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
          serverWalkedMeters={
            gameState.outdoor_progress?.level === activeLevel
              ? gameState.outdoor_progress.walked_meters
              : 0
          }
          onArriveOutdoor={onArriveOutdoor}
          onSolveGpsCheckpoint={onSolveGpsCheckpoint}
          onReportWalkProgress={onReportWalkProgress}
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
    </>
  );
}
