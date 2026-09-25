"use client";

import { useEffect, useState } from "react";
import { getEventLiveRanking } from "@/app/actions/event-results";
import type { EventResultsSnapshot, EventResultsTeam } from "@/lib/grid/event-results";

type Props = {
  inviteCode: string;
  highlightJoinCode?: string;
};

function statusCopy(team: EventResultsTeam): string {
  if (team.status === "finished") return "Fertig";
  if (team.status === "playing") {
    return `Noch im Spiel · ${team.done_levels.length}/${team.total_levels}`;
  }
  if (team.status === "lobby" || team.status === "setup") return "Noch nicht gestartet";
  return team.status;
}

export function EventLiveRanking({ inviteCode, highlightJoinCode }: Props) {
  const [snapshot, setSnapshot] = useState<EventResultsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void getEventLiveRanking(inviteCode).then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setError(result.error);
          return;
        }
        setSnapshot(result.data);
      });
    };
    load();
    const id = window.setInterval(load, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [inviteCode]);

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (!snapshot) {
    return <p className="text-sm text-slate-500">Live-Ranking wird geladen…</p>;
  }

  const mine = highlightJoinCode?.toUpperCase() ?? "";
  const finished = snapshot.teams.filter((team) => team.status === "finished").length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        {snapshot.teams.length} Teams · {finished} fertig · aktualisiert sich von selbst
      </p>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              <th className="pb-2 pr-2">#</th>
              <th className="pb-2 pr-2">Team</th>
              <th className="pb-2 pr-2">Status</th>
              <th className="pb-2 pr-2 text-right">Richtig</th>
              <th className="pb-2 pr-2 text-right">Direkt</th>
              <th className="pb-2 pr-2 text-right">Tipps</th>
              <th className="pb-2 pr-2 text-right">Bonus</th>
              <th className="pb-2 text-right">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.teams.map((team, index) => {
              const highlight = team.join_code === mine;
              return (
                <tr
                  key={team.id}
                  className={highlight ? "bg-teal-50 font-semibold" : ""}
                >
                  <td className="py-2.5 pr-2 tabular-nums text-slate-500">#{index + 1}</td>
                  <td className="py-2.5 pr-2 text-slate-900">
                    {team.name}
                    {highlight ? " · ihr" : ""}
                  </td>
                  <td className="py-2.5 pr-2 text-slate-600">{statusCopy(team)}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">{team.solved_count}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">{team.revealed_levels.length}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">{team.hints_count}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">{team.bonuses_solved}</td>
                  <td className="py-2.5 text-right text-base font-extrabold tabular-nums text-teal-800">
                    {team.score}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 sm:hidden">
        {snapshot.teams.map((team, index) => {
          const highlight = team.join_code === mine;
          return (
            <li
              key={team.id}
              className={`rounded-2xl px-4 py-3 ${
                highlight ? "bg-teal-50 ring-2 ring-teal-200" : "bg-white ring-1 ring-slate-200"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-bold text-slate-900">
                  <span className="mr-1.5 text-slate-500">#{index + 1}</span>
                  {team.name}
                  {highlight ? " · ihr" : ""}
                </p>
                <p className="shrink-0 text-lg font-extrabold tabular-nums text-teal-800">
                  {team.score}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-500">{statusCopy(team)}</p>
              <p className="mt-1 text-xs text-slate-600">
                {team.solved_count} richtig · {team.revealed_levels.length} direkt ·{" "}
                {team.hints_count} Tipps · {team.bonuses_solved} Bonus
              </p>
            </li>
          );
        })}
      </ul>
      {snapshot.teams.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          Noch keine Teams in diesem Event.
        </p>
      ) : null}
    </div>
  );
}
