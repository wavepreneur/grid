"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEventCockpitSnapshot } from "@/app/actions/cockpit";
import { IconArrowRight, IconPlay } from "@/components/cms/studio-icons";
import { useCockpitSync } from "@/lib/hooks/use-cockpit-sync";
import { cockpitPath } from "@/lib/grid/event-routes";
import { queryKeys } from "@/lib/platform/query-keys";

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
  const queryClient = useQueryClient();
  const { data: snapshot = null } = useQuery({
    queryKey: queryKeys.cockpit.show(inviteCode),
    queryFn: async () => {
      const result = await getEventCockpitSnapshot(inviteCode);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5_000,
  });

  useCockpitSync({
    inviteCode,
    enabled: Boolean(snapshot),
    onUpdate: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cockpit.show(inviteCode) });
    },
  });

  if (!snapshot) {
    return (
      <div className="grid-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Live-Ranking wird geladen…</p>
      </div>
    );
  }

  const sortedTeams = [...snapshot.teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.current_level - a.current_level;
  });

  return (
    <div className="grid-bg min-h-screen px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white">
              <IconPlay size={22} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">
                Live-Ranking
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {snapshot.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {sortedTeams.length} Teams · Live via Realtime
              </p>
            </div>
          </div>
          <Link
            href={cockpitPath(inviteCode)}
            className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Operator-Cockpit
            <IconArrowRight size={16} />
          </Link>
        </header>

        <ul className="flex flex-col gap-3">
          {sortedTeams.map((team, index) => (
            <li
              key={team.id}
              className={`flex items-center justify-between rounded-2xl border px-5 py-5 shadow-sm sm:px-6 sm:py-6 ${
                index === 0
                  ? "border-teal-300 bg-teal-50"
                  : index === 1
                    ? "border-slate-200 bg-white"
                    : index === 2
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50/80"
              }`}
            >
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold sm:h-12 sm:w-12 sm:text-xl ${
                    index === 0
                      ? "bg-teal-600 text-white"
                      : index === 1
                        ? "bg-slate-200 text-slate-700"
                        : index === 2
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
                    {team.name}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Aufgabe {team.current_level || "—"} · {statusLabel(team.status)} ·{" "}
                    {team.active_player_count} Spieler
                  </p>
                </div>
              </div>
              <p className="ml-4 shrink-0 text-3xl font-semibold tabular-nums text-teal-700 sm:text-4xl">
                {team.score}
              </p>
            </li>
          ))}
        </ul>

        {sortedTeams.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
            Noch keine Teams aktiv — warte auf den ersten Start.
          </p>
        ) : null}
      </div>
    </div>
  );
}
