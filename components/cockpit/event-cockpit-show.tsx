"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getEventCockpitSnapshot, type EventCockpitSnapshot } from "@/app/actions/cockpit";
import { cockpitPath } from "@/lib/grid/event-routes";

type EventCockpitShowProps = {
  inviteCode: string;
};

function statusLabel(status: string): string {
  if (status === "playing") return "Im Spiel";
  if (status === "finished") return "Fertig";
  if (status === "lobby") return "Lobby";
  return status;
}

export function EventCockpitShow({ inviteCode }: EventCockpitShowProps) {
  const [snapshot, setSnapshot] = useState<EventCockpitSnapshot | null>(null);

  const refresh = useCallback(async () => {
    const result = await getEventCockpitSnapshot(inviteCode);
    if (result.success) setSnapshot(result.data);
  }, [inviteCode]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  if (!snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-[var(--grid-muted)]">Live-Ranking wird geladen…</p>
      </div>
    );
  }

  const sortedTeams = [...snapshot.teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.current_level - a.current_level;
  });

  return (
    <div className="grid-bg min-h-screen px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--grid-accent)]">
              Live Ranking
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">{snapshot.title}</h1>
          </div>
          <Link
            href={cockpitPath(inviteCode)}
            className="text-sm text-[var(--grid-muted)] hover:text-white"
          >
            Operator-Cockpit →
          </Link>
        </header>

        <ul className="flex flex-col gap-4">
          {sortedTeams.map((team, index) => (
            <li
              key={team.id}
              className={`flex items-center justify-between rounded-2xl border px-6 py-5 ${
                index === 0
                  ? "border-[var(--grid-accent)]/40 bg-[var(--grid-accent)]/10"
                  : "border-[var(--grid-border)] bg-black/30"
              }`}
            >
              <div className="flex items-center gap-5">
                <span className="text-3xl font-bold text-[var(--grid-accent)]">
                  #{index + 1}
                </span>
                <div>
                  <p className="text-xl font-medium">{team.name}</p>
                  <p className="mt-1 text-sm text-[var(--grid-muted)]">
                    Level {team.current_level || "—"} · {statusLabel(team.status)} ·{" "}
                    {team.active_player_count} Spieler
                  </p>
                </div>
              </div>
              <p className="text-4xl font-semibold tabular-nums">{team.score}</p>
            </li>
          ))}
        </ul>

        {sortedTeams.length === 0 ? (
          <p className="text-center text-[var(--grid-muted)]">Noch keine Teams aktiv.</p>
        ) : null}
      </div>
    </div>
  );
}
