"use client";

import { ExitmaniaLevelView } from "@/components/game/exitmania-level-view";
import { CityStatusHud } from "@/components/game/city/status-hud";
import { CityTeamBar } from "@/components/game/city/team-bar";
import { PlayBonusView } from "@/components/game/play-bonus-view";
import { PlayHubView } from "@/components/game/play-hub-view";
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

type Props = {
  eventContent: ResolvedEventContent;
  gameState: TeamGameState;
  activeLevel: number;
  teamName: string;
  myName: string;
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
  onArriveOutdoor: (geolocation: GeolocationSample) => void;
  onSolveGpsCheckpoint: (geolocation: GeolocationSample) => void;
  onOpenStation: (levelNumber: number) => void;
  onSubmitStationCode: (code: string) => void;
  onStartMission: (levelNumber: number) => void;
  onSubmitQuiz: (payload: {
    selectedOptionId?: string;
    selectedOptionIds?: string[];
  }) => void;
  onSolveLevel: (payload: SolveLevelPayload) => void;
  onPurchaseHint: (tileId: string) => void;
  onSubmitBonus: (selectedOptionId: string) => void;
  onSkipBonus: () => void;
};

export function PlayPhaseFlow({
  eventContent,
  gameState,
  activeLevel,
  teamName,
  myName,
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
  onArriveOutdoor,
  onSolveGpsCheckpoint,
  onOpenStation,
  onSubmitStationCode,
  onStartMission,
  onSubmitQuiz,
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
  const remaining = Math.max(0, eventContent.levels.length - completed);

  const chrome = (
    <div className="space-y-3 px-4 pb-2 pt-5">
      <CityTeamBar teamName={teamName} meName={myName} meRoleLabel={myRoleLabel} compact />
      <CityStatusHud
        mode={mode}
        remaining={remaining}
        timeLabel={timeLabel}
        score={score}
      />
    </div>
  );

  if (phase === "bonus" && level) {
    const bonus = resolveBonusTask(level);
    if (bonus) {
      return (
        <>
          {chrome}
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
        <PlayHubView
          mode={mode}
          levels={eventContent.levels}
          levelStatuses={gameState.levels}
          activeLevel={activeLevel}
          canUnlockGps={canUnlockGps}
          disabled={disabled}
          isPending={isPending}
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
        <PlayQuizView
          title={level.title}
          spotLabel={
            mode === "indoor"
              ? "Station geöffnet"
              : mode === "online"
                ? "Mission gestartet"
                : "Wegpunkt erreicht"
          }
          quiz={slot.quiz}
          disabled={disabled}
          isPending={isPending}
          onSubmit={onSubmitQuiz}
        />
      </>
    );
  }

  const mission: LevelDefinition = missionFromLevel(level);

  return (
    <>
      {chrome}
      <div className="px-4 pb-6">
        <ExitmaniaLevelView
          level={mission}
          allLevels={eventContent.levels}
          levelStatuses={gameState.levels}
          purchasedHints={purchasedHints}
          score={score}
          disabled={disabled}
          isPending={isPending}
          canUnlockGps={canUnlockGps}
          effectiveBeta={effectiveBeta}
          soloAlpha={soloAlpha}
          gpsCapability={mode === "outdoor" && mission.type === "gps"}
          levelStartedAt={levelStartedAt}
          teamStartedAt={teamStartedAt}
          onSubmit={onSolveLevel}
          onPurchaseHint={onPurchaseHint}
        />
      </div>
    </>
  );
}
