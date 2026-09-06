"use client";

import { useEffect, useState } from "react";
import { getPortalEventIntelligence } from "@/app/actions/event-intelligence";
import type { EventIntelligenceSnapshot } from "@/lib/grid/event-intelligence";

type Props = {
  portalToken: string;
};

function scoreLabel(value: number | null): string {
  return value === null ? "—" : String(value);
}

export function EventIntelligencePanel({ portalToken }: Props) {
  const [snapshot, setSnapshot] = useState<EventIntelligenceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPortalEventIntelligence(portalToken).then((result) => {
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
  }, [portalToken]);

  if (error) {
    return <p className="text-sm text-slate-500">{error}</p>;
  }

  if (!snapshot) {
    return <p className="text-sm text-slate-500">Data wird geladen…</p>;
  }

  if (snapshot.teams.length === 0) {
    return <p className="text-sm text-slate-500">Noch keine Teams für die Auswertung.</p>;
  }

  return (
    <ul className="space-y-2">
      {snapshot.teams.map((team) => (
        <li key={team.id} className="rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">{team.name}</p>
            <p className="text-sm tabular-nums text-slate-500">{team.score} Pkt.</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Tempo {scoreLabel(team.scores.decisionSpeed)} · Stress{" "}
            {scoreLabel(team.scores.stressResilience)} · Agilität{" "}
            {scoreLabel(team.scores.teamAgility)} · {team.scores.attemptsFailed} falsch ·{" "}
            {team.scores.hints} Tipps
          </p>
        </li>
      ))}
    </ul>
  );
}
