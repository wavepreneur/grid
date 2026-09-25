"use client";

import { useEffect, useState } from "react";
import { listPlayEventRanking } from "@/app/actions/event-results";
import type { EventResultsSnapshot } from "@/lib/grid/event-results";

type Props = {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  myTeamName: string;
};

export function TeamPlayRanking({ inviteCode, joinCode, sessionId, myTeamName }: Props) {
  const [snapshot, setSnapshot] = useState<EventResultsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listPlayEventRanking({ inviteCode, joinCode, sessionId }).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSnapshot(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [inviteCode, joinCode, sessionId]);

  if (error) {
    return (
      <div className="rounded-3xl bg-[var(--cg-card)] px-5 py-5 text-center shadow-[var(--cg-shadow-soft)]">
        <p className="text-sm text-[var(--cg-destructive)]">{error}</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-3xl bg-[var(--cg-card)] px-5 py-5 text-center shadow-[var(--cg-shadow-soft)]">
        <p className="text-sm text-[var(--cg-muted)]">Ranking wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-[var(--cg-card)] px-5 py-5 shadow-[var(--cg-shadow-soft)]">
      <p className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--cg-muted)]">
        Ranking
      </p>
      <ol className="mt-4 space-y-2">
        {snapshot.teams.map((team, index) => {
          const mine = team.name === myTeamName;
          return (
            <li
              key={team.id}
              className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 ${
                mine
                  ? "bg-[var(--cg-primary)]/12 ring-2 ring-[var(--cg-primary)]/30"
                  : "bg-[var(--cg-bg)]"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--cg-fg)]">
                  <span className="mr-1.5 text-[var(--cg-muted)]">#{index + 1}</span>
                  {team.name}
                  {mine ? " · ihr" : ""}
                </p>
                <p className="text-xs text-[var(--cg-muted)]">
                  {team.done_levels.length} Aufgaben
                </p>
              </div>
              <p className="shrink-0 text-lg font-extrabold tabular-nums text-[var(--cg-fg)]">
                {team.score}
              </p>
            </li>
          );
        })}
      </ol>
      {snapshot.teams.length === 0 ? (
        <p className="mt-3 text-center text-sm text-[var(--cg-muted)]">Noch keine Teams.</p>
      ) : null}
    </div>
  );
}
