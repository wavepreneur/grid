"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { GrowthRecapCard } from "@/components/game/growth-recap-card";
import { BigButton } from "@/components/game/city/ui";
import type { GrowthOffer } from "@/lib/grid/growth-pack";
import { EXITMANIA_TEAM_RANKING_URL } from "@/lib/grid/growth-pack";
import { eventRankingPath, eventRecapPath } from "@/lib/grid/event-routes";
import { levelPlayOutcome, type TeamGameState } from "@/lib/grid/game-state";
import type { LevelDefinition } from "@/lib/grid/level-types";

type Props = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
  eventTitle?: string;
  score: number;
  levels: LevelDefinition[];
  gameState: TeamGameState;
  growthOffer?: GrowthOffer | null;
  extras?: ReactNode;
};

function teamHeadline(name: string): string {
  const trimmed = name.trim() || "Team";
  return /^team\b/i.test(trimmed) ? trimmed : `Team ${trimmed}`;
}

function rankingSrc(
  inviteCode: string,
  joinCode: string,
  teamevent: boolean,
): string {
  if (!teamevent) return `${EXITMANIA_TEAM_RANKING_URL}?embed=1`;
  const path = eventRankingPath(inviteCode, joinCode);
  return path.includes("?") ? `${path}&embed=1` : `${path}?embed=1`;
}

export function GameOverFlywheel({
  inviteCode,
  joinCode,
  teamName,
  eventTitle,
  score,
  levels,
  gameState,
  growthOffer,
  extras,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const total = levels.length;
  const reason = gameState.ended_reason ?? (countDone(gameState) >= total && total > 0 ? "completed" : "ended");
  const timeUp = reason === "time";
  const won = reason === "completed";
  const completed = countDone(gameState);
  const solved = levels.filter(
    (level) => levelPlayOutcome(gameState.levels[String(level.level)]) === "solved",
  ).length;
  const revealed = levels.filter(
    (level) => levelPlayOutcome(gameState.levels[String(level.level)]) === "revealed",
  ).length;
  const missionName = eventTitle?.replace(/^\[Test\]\s*/, "").trim() || "";
  const teamLabel = teamHeadline(teamName);
  const teamevent = growthOffer?.surface === "exitmania_teamevent";
  const embedSrc = rankingSrc(inviteCode, joinCode, teamevent);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!rankingOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [rankingOpen]);

  async function copyRecapLink() {
    const path = eventRecapPath(inviteCode, joinCode);
    const url =
      typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Link kopieren", url);
    }
  }

  return (
    <div
      className="cg-animate-rise-in space-y-5 px-5 pb-[max(2.5rem,calc(1.25rem+env(safe-area-inset-bottom)))] pt-[max(2.5rem,env(safe-area-inset-top))]"
      translate="no"
    >
      <div className="space-y-2 text-center">
        <span
          aria-hidden
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white shadow-[var(--cg-shadow-lift)] ${
            won ? "cg-animate-celebrate bg-[var(--cg-success)]" : "bg-[var(--cg-primary)]"
          }`}
        >
          {won ? "✓" : timeUp ? "⏱" : "!"}
        </span>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--cg-muted)]">
          Game Over
        </p>
        {missionName ? (
          <p className="text-base font-semibold text-[var(--cg-fg)]">{missionName}</p>
        ) : null}
        <p className="cg-animate-pop-in text-3xl font-bold text-[var(--cg-fg)]">
          {won ? "Mission abgeschlossen!" : timeUp ? "Zeit ist abgelaufen." : "Game Over"}
        </p>
        <p className="text-base text-[var(--cg-muted)]">
          {won
            ? `${teamLabel} · ${total} Aufgaben`
            : timeUp
              ? `${completed} von ${total} Aufgaben — ${teamLabel}`
              : `${completed} von ${total} Aufgaben geschafft · ${teamLabel}`}
        </p>
      </div>

      <section className="cg-animate-pop-in rounded-3xl border-2 border-[var(--cg-success)]/35 bg-[var(--cg-card)] px-5 py-6 text-center shadow-[var(--cg-shadow-lift)]">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--cg-muted)]">
          Eure Punkte
        </p>
        <p className="cg-animate-score-pop mt-2 text-5xl font-extrabold tabular-nums text-[var(--cg-fg)]">
          {score}
        </p>
        <ol className="mt-4 flex flex-wrap justify-center gap-1.5">
          {levels.map((level) => {
            const outcome = levelPlayOutcome(gameState.levels[String(level.level)]);
            const tone =
              outcome === "solved"
                ? "bg-[var(--cg-success)] text-white"
                : outcome === "revealed"
                  ? "bg-[var(--cg-accent)] text-[var(--cg-accent-fg)]"
                  : "bg-[var(--cg-muted)]/15 text-[var(--cg-muted)]";
            return (
              <li
                key={level.level}
                title={
                  outcome === "revealed"
                    ? `${level.title} · direkt gelöst · 0 Punkte`
                    : level.title
                }
                className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold ${tone}`}
              >
                {level.level}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-[var(--cg-muted)]">
          {revealed > 0
            ? `${solved} gelöst · ${revealed} direkt gelöst · nur euer Team`
            : `${completed} / ${total} Aufgaben · nur euer Team`}
        </p>
      </section>

      <section className="rounded-3xl border border-[var(--cg-primary)]/25 bg-[var(--cg-card)] px-5 py-5 text-center">
        <p className="text-lg font-bold text-[var(--cg-fg)]">
          {teamevent
            ? "🏆 Live-Ranking eures Events"
            : "🏆 Wie habt ihr im Highscore abgeschnitten?"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--cg-muted)]">
          {teamevent
            ? "Kurz bewerten — danach seht ihr das Ranking eures Events."
            : "Kurz bewerten — danach seht ihr das All-Time-Highscore-Ranking."}
        </p>
        <div className="mt-4">
          <BigButton onClick={() => setRankingOpen(true)}>
            {teamevent ? "Event-Ranking öffnen" : "Highscore öffnen"}
          </BigButton>
        </div>
      </section>

      {growthOffer?.enabled ? (
        <GrowthRecapCard
          offer={growthOffer}
          score={score}
        />
      ) : null}

      <section className="rounded-3xl bg-[var(--cg-card)] px-5 py-5 text-center">
        <p className="text-lg font-bold text-[var(--cg-fg)]">📌 Für später</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--cg-muted)]">
          Der Link wird nach 7 Tagen automatisch deaktiviert.
        </p>
        <div className="mt-4">
          <BigButton variant="ghost" onClick={() => void copyRecapLink()}>
            {copied ? "Link kopiert" : "Link kopieren"}
          </BigButton>
        </div>
      </section>

      {teamevent ? null : (
        <p className="text-center text-sm">
          <Link
            href={eventRankingPath(inviteCode, joinCode)}
            className="font-semibold text-[var(--cg-primary)] underline-offset-2 hover:underline"
          >
            Live-Ranking dieses Events
          </Link>
        </p>
      )}

      {extras ? <div className="space-y-5">{extras}</div> : null}

      {mounted && rankingOpen
        ? createPortal(
            <div className="fixed inset-0 z-[4000] bg-black">
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-black/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <p className="truncate text-sm font-semibold text-white">
                  {teamevent ? "Event-Ranking" : "Highscore"}
                </p>
                <button
                  type="button"
                  onClick={() => setRankingOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
                  aria-label="Ranking schließen"
                >
                  <X className="h-5 w-5" strokeWidth={2.4} />
                </button>
              </div>
              <iframe
                src={embedSrc}
                title={teamevent ? "Event-Ranking" : "Highscore"}
                className="absolute inset-0 h-full w-full border-0 bg-white pt-14"
                allow="fullscreen"
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function countDone(gameState: TeamGameState): number {
  return Object.values(gameState.levels).filter((entry) => entry.status === "completed").length;
}
