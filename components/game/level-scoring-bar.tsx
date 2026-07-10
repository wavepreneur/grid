"use client";

import { formatCountdown } from "@/lib/grid/level-scoring";
import { useLevelScoringTimer } from "@/lib/hooks/use-level-scoring-timer";
import type { LevelScoring } from "@/lib/grid/level-types";

type Props = {
  scoring: LevelScoring;
  startedAt?: string | null;
  fallbackStartedAt?: string | null;
  compact?: boolean;
};

export function LevelScoringBar({
  scoring,
  startedAt,
  fallbackStartedAt,
  compact = false,
}: Props) {
  const snapshot = useLevelScoringTimer(scoring, startedAt, fallbackStartedAt);

  if (!snapshot) return null;

  const showCountdown = snapshot.hasCountdown && snapshot.remainingSeconds !== null;
  const showDecay = snapshot.hasDecay;
  const urgent =
    showCountdown && snapshot.remainingSeconds !== null && snapshot.remainingSeconds <= 30;

  const decayProgress =
    showDecay && scoring.countdown_seconds
      ? Math.min(1, snapshot.elapsedSeconds / scoring.countdown_seconds)
      : 0;

  if (!showCountdown && !showDecay && snapshot.maxPoints === 0) return null;

  return (
    <div
      className={`rounded-2xl border ${
        urgent ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"
      } ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Erreichbare Punkte
          </p>
          <p
            className={`mt-0.5 font-semibold tabular-nums text-slate-900 ${
              compact ? "text-lg" : "text-2xl"
            }`}
          >
            {snapshot.currentPoints >= 0 ? "+" : ""}
            {snapshot.currentPoints}
            {showDecay && snapshot.currentPoints !== snapshot.maxPoints ? (
              <span className="ml-2 text-sm font-normal text-slate-400 line-through">
                {snapshot.maxPoints >= 0 ? "+" : ""}
                {snapshot.maxPoints}
              </span>
            ) : null}
          </p>
        </div>

        {showCountdown ? (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Countdown
            </p>
            <p
              className={`mt-0.5 font-mono font-bold tabular-nums ${
                urgent ? "text-amber-700" : "text-slate-900"
              } ${compact ? "text-xl" : "text-2xl"}`}
            >
              {formatCountdown(snapshot.remainingSeconds ?? 0)}
            </p>
          </div>
        ) : null}
      </div>

      {showDecay ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full transition-all duration-1000 ${
                urgent ? "bg-amber-500" : "bg-teal-500"
              }`}
              style={{ width: `${Math.round(decayProgress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-600">
            {snapshot.isExpired
              ? `Zeit abgelaufen — nur noch ${snapshot.floorPoints} Punkte möglich.`
              : `Schnell lösen — Punkte sinken bis ${snapshot.floorPoints}.`}
          </p>
        </div>
      ) : showCountdown && snapshot.isExpired ? (
        <p className="mt-2 text-[11px] font-medium text-amber-800">Countdown abgelaufen.</p>
      ) : null}
    </div>
  );
}
