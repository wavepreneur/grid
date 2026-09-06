"use client";

import { useMemo, useState } from "react";
import type { EventResultsSnapshot } from "@/lib/grid/event-results";

function statusLabel(status: string): string {
  if (status === "playing") return "Im Spiel";
  if (status === "finished") return "Fertig";
  if (status === "lobby" || status === "setup") return "Lobby";
  return status;
}

type Props = {
  snapshot: EventResultsSnapshot;
};

export function EventResultsBoard({ snapshot }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return snapshot.teams.map((team, index) => ({ team, rank: index + 1 }));
    return snapshot.teams
      .map((team, index) => ({ team, rank: index + 1 }))
      .filter(
        ({ team }) =>
          team.name.toLowerCase().includes(needle) ||
          (team.captain_name?.toLowerCase().includes(needle) ?? false),
      );
  }, [query, snapshot.teams]);

  return (
    <div className="space-y-4">
      {snapshot.teams.length >= 8 ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Team suchen…"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-700"
        />
      ) : null}
      {filtered.map(({ team, rank }) => (
        <article
          key={team.id}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                <span className="mr-2 text-teal-700">#{rank}</span>
                {team.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {statusLabel(team.status)}
                {team.captain_name ? ` · ${team.captain_name}` : ""}
                {` · ${team.player_count} Spieler`}
              </p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-slate-900">{team.score}</p>
          </div>
          <ol className="mt-3 flex flex-wrap gap-1.5">
            {snapshot.levels.map((level) => {
              const done = team.done_levels.includes(level.level);
              return (
                <li
                  key={level.level}
                  title={level.title}
                  className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold ${
                    done ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {level.level}
                </li>
              );
            })}
          </ol>
        </article>
      ))}
      {snapshot.teams.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          Noch keine Teams in diesem Event.
        </p>
      ) : null}
      {snapshot.teams.length > 0 && filtered.length === 0 ? (
        <p className="text-sm text-slate-500">Kein Team passt zur Suche.</p>
      ) : null}
    </div>
  );
}
