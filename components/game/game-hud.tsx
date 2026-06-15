"use client";

import Link from "next/link";
import { useMissionCountdown } from "@/lib/hooks/use-mission-countdown";
import { cockpitShowPath } from "@/lib/grid/event-routes";

type GameHudProps = {
  inviteCode: string;
  teamName: string;
  eventTitle: string;
  currentLevel: number;
  totalLevels: number;
  completedLevels: number;
  score: number;
  startedAt: string | null;
  missionDurationMinutes: number;
  showLiveScore: boolean;
  isConnected: boolean;
};

export function GameHud({
  inviteCode,
  teamName,
  eventTitle,
  currentLevel,
  totalLevels,
  completedLevels,
  score,
  startedAt,
  missionDurationMinutes,
  showLiveScore,
  isConnected,
}: GameHudProps) {
  const { remainingLabel, isExpired } = useMissionCountdown(
    startedAt,
    missionDurationMinutes,
  );

  const progressPercent =
    totalLevels > 0 ? Math.min(100, Math.round((completedLevels / totalLevels) * 100)) : 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--grid-border)] bg-black/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-[0.2em] text-[var(--grid-muted)]">
            {eventTitle}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-white">{teamName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-[var(--grid-border)] px-3 py-1 tabular-nums text-white">
            ⭐ {score} P
          </span>
          <span
            className={`rounded-full border px-3 py-1 tabular-nums ${
              isExpired
                ? "border-amber-400/40 text-amber-200"
                : "border-[var(--grid-border)] text-white"
            }`}
          >
            ⏱ {remainingLabel}
          </span>
          {showLiveScore ? (
            <Link
              href={cockpitShowPath(inviteCode)}
              target="_blank"
              className="rounded-full border border-emerald-400/30 px-3 py-1 text-emerald-300 hover:bg-emerald-400/10"
            >
              Live-Score
            </Link>
          ) : null}
          <span className="rounded-full border border-[var(--grid-border)] px-3 py-1 text-[var(--grid-muted)]">
            {isConnected ? "Live" : "Sync…"}
          </span>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--grid-muted)]">
          <span>
            Level {Math.min(currentLevel, totalLevels)} / {totalLevels}
          </span>
          <span>{completedLevels} abgeschlossen</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--grid-accent)] to-emerald-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
