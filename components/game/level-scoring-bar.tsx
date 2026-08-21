"use client";

import { Timer } from "lucide-react";
import { formatCountdown } from "@/lib/grid/level-scoring";
import { useLevelScoringTimer } from "@/lib/hooks/use-level-scoring-timer";
import type { LevelScoring } from "@/lib/grid/level-types";
import { LevelScoreHud, ScorePill } from "@/components/game/city/level-screen-blocks";

type Props = {
  scoring: LevelScoring;
  startedAt?: string | null;
  fallbackStartedAt?: string | null;
  compact?: boolean;
};

/**
 * Gamer-HUD: erreichbare Punkte, optional Countdown + Decay — sofort lesbar.
 */
export function LevelScoringBar({
  scoring,
  startedAt,
  fallbackStartedAt,
  compact = false,
}: Props) {
  const snapshot = useLevelScoringTimer(scoring, startedAt, fallbackStartedAt);

  if (!snapshot) {
    if (scoring.points === 0) return null;
    return (
      <LevelScoreHud>
        <ScorePill tone="accent">
          {scoring.points >= 0 ? "+" : ""}
          {scoring.points} P
        </ScorePill>
        <ScorePill>Lösung möglich</ScorePill>
      </LevelScoreHud>
    );
  }

  const showCountdown = snapshot.hasCountdown && snapshot.remainingSeconds !== null;
  const showDecay = snapshot.hasDecay;
  const urgent =
    showCountdown && snapshot.remainingSeconds !== null && snapshot.remainingSeconds <= 30;

  if (!showCountdown && !showDecay && snapshot.maxPoints === 0) return null;

  const decayProgress =
    showDecay && scoring.countdown_seconds
      ? Math.min(1, snapshot.elapsedSeconds / scoring.countdown_seconds)
      : 0;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <LevelScoreHud>
        <ScorePill tone={showDecay && !snapshot.isExpired ? "accent" : "default"}>
          {snapshot.currentPoints >= 0 ? "+" : ""}
          {snapshot.currentPoints} P
          {showDecay && snapshot.currentPoints !== snapshot.maxPoints ? (
            <span className="font-semibold opacity-50 line-through">
              {snapshot.maxPoints >= 0 ? "+" : ""}
              {snapshot.maxPoints}
            </span>
          ) : null}
        </ScorePill>

        {showCountdown ? (
          <ScorePill tone={urgent ? "urgent" : "default"}>
            <Timer className="h-3.5 w-3.5" />
            {formatCountdown(snapshot.remainingSeconds ?? 0)}
          </ScorePill>
        ) : (
          <ScorePill tone="success">Lösung möglich</ScorePill>
        )}
      </LevelScoreHud>

      {showDecay ? (
        <div className="px-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--cg-secondary)]">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                urgent ? "bg-amber-500" : "bg-[var(--cg-primary)]"
              }`}
              style={{ width: `${Math.round((1 - decayProgress) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-[11px] font-medium text-[var(--cg-muted)]">
            {snapshot.isExpired
              ? `Zeit ab — noch ${snapshot.floorPoints} P möglich`
              : `Punkte sinken bis ${snapshot.floorPoints} P`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
