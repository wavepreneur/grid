"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
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
  score: number;
  levels: LevelDefinition[];
  gameState: TeamGameState;
  growthOffer?: GrowthOffer | null;
  extras?: ReactNode;
};

export function GameOverFlywheel({
  inviteCode,
  joinCode,
  teamName,
  score,
  levels,
  gameState,
  growthOffer,
  extras,
}: Props) {
  const [copied, setCopied] = useState(false);
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
        <p className="cg-animate-pop-in text-3xl font-bold text-[var(--cg-fg)]">
          {won ? "Mission abgeschlossen!" : timeUp ? "Zeit ist abgelaufen." : "Game Over"}
        </p>
        <p className="text-base text-[var(--cg-muted)]">
          {won
            ? `${teamName} · ${total} Aufgaben`
            : timeUp
              ? `${completed} von ${total} Aufgaben — ${teamName}`
              : `${completed} von ${total} Aufgaben geschafft.`}
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
          🏆 Wie habt ihr im Highscore abgeschnitten?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--cg-muted)]">
          Kurz bewerten — dann seht ihr die Tabelle. Dauert 20 Sekunden.
        </p>
        <a
          href={EXITMANIA_TEAM_RANKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block"
        >
          <BigButton variant="accent">Highscore ansehen</BigButton>
        </a>
      </section>

      {growthOffer?.enabled ? (
        <GrowthRecapCard
          offer={growthOffer}
          score={score}
        />
      ) : null}

      <section className="rounded-3xl bg-[var(--cg-card)] px-5 py-5 text-center">
        <p className="text-lg font-bold text-[var(--cg-fg)]">📌 Für später speichern</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--cg-muted)]">
          Link kopieren und in die Notizen legen — so findet ihr diese Seite auch nächste Woche
          wieder.
        </p>
        <div className="mt-4">
          <BigButton variant="ghost" onClick={() => void copyRecapLink()}>
            {copied ? "Link kopiert" : "Link kopieren"}
          </BigButton>
        </div>
      </section>

      <p className="text-center text-sm">
        <Link
          href={eventRankingPath(inviteCode, joinCode)}
          className="font-semibold text-[var(--cg-primary)] underline-offset-2 hover:underline"
        >
          Live-Ranking dieses Events
        </Link>
      </p>

      {extras ? <div className="space-y-5">{extras}</div> : null}
    </div>
  );
}

function countDone(gameState: TeamGameState): number {
  return Object.values(gameState.levels).filter((entry) => entry.status === "completed").length;
}
