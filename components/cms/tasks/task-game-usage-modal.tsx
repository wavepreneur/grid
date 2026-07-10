"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTaskGameUsage } from "@/app/actions/cms/delete";
import type { TaskGameUsage } from "@/lib/cms/delete-status";
import { StudioBadge } from "@/components/cms/admin-shell";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { IconArrowRight, IconGamepad } from "@/components/cms/studio-icons";
import { StudioButton, StudioError } from "@/components/cms/studio-ui";

type Props = {
  taskId: string;
  taskTitle: string;
  gameCount: number;
  liveGameCount: number;
  className?: string;
};

export function TaskGameUsageButton({
  taskId,
  taskTitle,
  gameCount,
  liveGameCount,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<TaskGameUsage | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    void getTaskGameUsage(taskId).then((result) => {
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setUsage(result.data!);
    });
  }, [open, taskId]);

  if (gameCount === 0) return null;

  const label =
    liveGameCount > 0
      ? `In ${gameCount} Spiel${gameCount === 1 ? "" : "en"} · ${liveGameCount} live`
      : `In ${gameCount} Spiel${gameCount === 1 ? "" : "en"}`;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          className ??
          "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
        }
      >
        {liveGameCount > 0 ? (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] uppercase text-emerald-800">
            Live
          </span>
        ) : null}
        {label}
      </button>

      <StudioModal
        open={open}
        onClose={() => setOpen(false)}
        title="Verwendung in Spielen"
        subtitle={taskTitle}
        size="lg"
        footer={
          <StudioButton type="button" variant="secondary" onClick={() => setOpen(false)}>
            Schließen
          </StudioButton>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Lade Spiele…</p>
        ) : error ? (
          <StudioError message={error} />
        ) : usage && usage.games.length > 0 ? (
          <div className="space-y-2">
            <p className="mb-4 text-sm text-slate-600">
              Diese Aufgabe ist in {usage.totalGameCount}{" "}
              {usage.totalGameCount === 1 ? "Spiel" : "Spielen"} eingebunden. Klicke auf ein Spiel,
              um die Aufgabe dort zu bearbeiten oder zu entfernen.
            </p>
            {usage.games.map((game) => (
              <Link
                key={game.linkId}
                href={`/admin/games/${game.gameId}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-teal-200 hover:bg-teal-50/40"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <IconGamepad size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{game.gameName}</p>
                      {game.liveEvents.length > 0 ? (
                        <StudioBadge tone="live">Live</StudioBadge>
                      ) : null}
                      <StudioBadge tone={game.gameStatus === "published" ? "live" : "draft"}>
                        {game.gameStatus === "published" ? "Veröffentlicht" : "Entwurf"}
                      </StudioBadge>
                      {game.publishedVersionNumber > 0 ? (
                        <StudioBadge>v{game.publishedVersionNumber}</StudioBadge>
                      ) : null}
                    </div>
                    {game.liveEvents.length > 0 ? (
                      <p className="mt-1 text-xs text-amber-800">
                        {game.liveEvents
                          .map((e) => `${e.title} (${e.invite_code})`)
                          .join(" · ")}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">
                        Kein laufendes Event — Entwurf kann bearbeitet werden.
                      </p>
                    )}
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-teal-600">
                  Öffnen
                  <IconArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Diese Aufgabe ist in keinem Spiel eingebunden.</p>
        )}
      </StudioModal>
    </>
  );
}

export function TaskGameUsageList({
  games,
}: {
  games: TaskGameUsage["games"];
}) {
  if (games.length === 0) return null;

  return (
    <ul className="space-y-2">
      {games.map((game) => (
        <li key={game.linkId}>
          <Link
            href={`/admin/games/${game.gameId}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-teal-200 hover:bg-teal-50/50"
          >
            <span className="font-medium text-slate-800">{game.gameName}</span>
            <span className="inline-flex items-center gap-1 text-teal-600">
              {game.liveEvents.length > 0 ? "Live · " : ""}
              Öffnen <IconArrowRight size={12} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
