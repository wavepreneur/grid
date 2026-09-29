"use client";

import { Timer } from "lucide-react";
import { formatCountdown, type LevelScoringSnapshot } from "@/lib/grid/level-scoring";
import { useLevelScoringTimer } from "@/lib/hooks/use-level-scoring-timer";
import type { LevelScoring } from "@/lib/grid/level-types";
import { playUi } from "@/lib/grid/play-ui";
import { LevelScoreHud, ScorePill } from "@/components/game/city/level-screen-blocks";

type Props = {
  scoring: LevelScoring;
  startedAt?: string | null;
  fallbackStartedAt?: string | null;
  compact?: boolean;
  /** Tighter HUD for an open media tile — same pills, less padding. */
  embedded?: boolean;
  snapshot?: LevelScoringSnapshot | null;
  language?: string | null;
};

/**
 * Gamer-HUD: erreichbare Punkte, optional Countdown + Decay — sofort lesbar.
 */
export function LevelScoringBar({
  scoring,
  startedAt,
  fallbackStartedAt,
  compact = false,
  embedded = false,
  snapshot: snapshotProp,
  language,
}: Props) {
  const t = playUi(language);
  const liveSnapshot = useLevelScoringTimer(
    snapshotProp ? undefined : scoring,
    snapshotProp ? null : startedAt,
    snapshotProp ? null : fallbackStartedAt,
  );
  const snapshot = snapshotProp ?? liveSnapshot;

  if (!snapshot) {
    if (scoring.points === 0 || embedded) return null;
    return (
      <LevelScoreHud>
        <ScorePill tone="accent">
          {scoring.points >= 0 ? "+" : ""}
          {scoring.points} P
        </ScorePill>
        <ScorePill>{t.scoring.noCountdown}</ScorePill>
      </LevelScoreHud>
    );
  }

  const showCountdown = snapshot.hasCountdown && snapshot.remainingSeconds !== null;
  const showDecay = snapshot.hasDecay;
  const urgent =
    showCountdown && snapshot.remainingSeconds !== null && snapshot.remainingSeconds <= 30;

  if (!showCountdown && !showDecay && snapshot.maxPoints === 0) return null;
  if (embedded && !showCountdown) return null;

  const decayProgress = showDecay ? snapshot.elapsedRatio : 0;

  return (
    <div className={embedded || compact ? "space-y-2" : "space-y-3"}>
      <LevelScoreHud align={embedded ? "start" : "center"}>
        <ScorePill tone={showDecay && !snapshot.isExpired ? "accent" : "default"}>
          {showDecay ? t.scoring.stillPrefix : null}
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
        ) : embedded ? null : (
          <ScorePill>{t.scoring.noCountdown}</ScorePill>
        )}
      </LevelScoreHud>

      {showDecay ? (
        <div className="px-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--cg-secondary)]">
            <div
              className={`h-full rounded-full ${
                urgent ? "bg-amber-500" : "bg-[var(--cg-primary)]"
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, (1 - decayProgress) * 100))}%`,
                transition: "width 250ms linear",
              }}
            />
          </div>
          <p
            className={`mt-1.5 text-[11px] font-medium text-[var(--cg-muted)] ${
              embedded ? "text-left" : "text-center"
            }`}
          >
            {snapshot.isExpired
              ? t.scoring.timesUp
              : t.scoring.pointsNow(
                  snapshot.currentPoints,
                  snapshot.currentPoints === 1 ? t.scoring.point : t.scoring.points,
                )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
