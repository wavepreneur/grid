"use client";

import Link from "next/link";
import { useMissionCountdown } from "@/lib/hooks/use-mission-countdown";
import { cockpitShowPath } from "@/lib/grid/event-routes";
import { IconCheck, IconMapPin, IconPlay } from "@/components/cms/studio-icons";

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
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{eventTitle}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{teamName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium tabular-nums text-slate-700">
            ⭐ {score} P
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 tabular-nums ${
              isExpired
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            ⏱ {remainingLabel}
          </span>
          {showLiveScore ? (
            <Link
              href={cockpitShowPath(inviteCode)}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <IconPlay size={12} />
              Live-Ranking
            </Link>
          ) : null}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
              isConnected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-400"}`}
            />
            {isConnected ? "Verbunden" : "Verbinde…"}
          </span>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <IconMapPin size={12} />
            Aufgabe {Math.min(currentLevel, totalLevels)} von {totalLevels}
          </span>
          <span className="inline-flex items-center gap-1">
            <IconCheck size={12} />
            {completedLevels} erledigt
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
