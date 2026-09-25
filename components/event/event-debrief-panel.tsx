"use client";

import { useEffect, useState } from "react";
import { getPortalEventDebrief } from "@/app/actions/event-debrief";
import type { DebriefLevel, EventDebriefSnapshot, EventDebriefTeam } from "@/lib/grid/event-debrief";

type Props = {
  portalToken: string;
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")} min`;
}

function outcomeLabel(outcome: DebriefLevel["outcome"]): string {
  if (outcome === "solved") return "Gelöst";
  if (outcome === "revealed") return "Direkt gelöst";
  return "Offen";
}

function outcomeClass(outcome: DebriefLevel["outcome"]): string {
  if (outcome === "solved") return "bg-emerald-600 text-white";
  if (outcome === "revealed") return "bg-amber-500 text-white";
  return "bg-slate-100 text-slate-400";
}

function barTone(value: number): string {
  if (value >= 70) return "bg-emerald-500";
  if (value >= 50) return "bg-amber-400";
  return "bg-rose-400";
}

export function EventDebriefPanel({ portalToken }: Props) {
  const [snapshot, setSnapshot] = useState<EventDebriefSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void getPortalEventDebrief(portalToken).then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setError(result.error);
          return;
        }
        setSnapshot(result.data);
        setOpenId((current) => current ?? result.data.teams[0]?.id ?? null);
      });
    };
    load();
    const id = window.setInterval(load, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [portalToken]);

  if (error) {
    return <p className="text-sm text-slate-500">{error}</p>;
  }

  if (!snapshot) {
    return <p className="text-sm text-slate-500">Manöverkritik wird geladen…</p>;
  }

  if (snapshot.teams.length === 0) {
    return <p className="text-sm text-slate-500">Noch keine Teams für die Auswertung.</p>;
  }

  const selected = snapshot.teams.find((team) => team.id === openId) ?? snapshot.teams[0]!;

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2">
        {snapshot.teams.map((team) => {
          const active = team.id === selected.id;
          return (
            <li key={team.id}>
              <button
                type="button"
                onClick={() => setOpenId(team.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  active ? "bg-teal-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {team.name}
                <span className="ml-2 tabular-nums opacity-80">{team.score}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <TeamDebrief team={selected} />
    </div>
  );
}

function TeamDebrief({ team }: { team: EventDebriefTeam }) {
  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
      <header>
        <p className="text-lg font-bold text-slate-900">{team.name}</p>
        <p className="mt-1 text-sm text-slate-500">
          {team.score} Punkte
          {team.facts.length > 0 ? ` · ${team.facts.join(" · ")}` : ""}
        </p>
      </header>

      <div className="space-y-3">
        {team.signals.map((signal) => (
          <div key={signal.key}>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
              <span>{signal.label}</span>
              <span className="tabular-nums">{signal.value}</span>
            </div>
            <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100">
              <span
                className={`block h-full rounded-full ${barTone(signal.value)}`}
                style={{ width: `${signal.value}%` }}
              />
            </span>
            <p className="mt-1 text-xs text-slate-500">{signal.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">Stärke</p>
          <p className="mt-1 text-sm text-slate-800">{team.strength}</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">Blind Spot</p>
          <p className="mt-1 text-sm text-slate-800">{team.blindspot}</p>
        </div>
      </div>

      <ol className="space-y-2">
        {team.levels.map((level) => (
          <li key={level.level} className="rounded-xl bg-slate-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${outcomeClass(level.outcome)}`}
              >
                {level.level}
              </span>
              <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{level.title}</p>
              <p className="text-xs font-semibold text-slate-500">
                {outcomeLabel(level.outcome)} · {formatDuration(level.durationMs)}
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {level.solvedBy.length > 0 ? `Gelöst von ${level.solvedBy.join(", ")}` : "Noch keine Lösung"}
              {level.gpsSkippedBy ? ` · GPS übersprungen von ${level.gpsSkippedBy}` : ""}
            </p>
            {level.hints.length > 0 ? (
              <p className="mt-1 text-xs text-slate-600">
                Tipps:{" "}
                {level.hints
                  .map((hint) =>
                    hint.cost !== null ? `${hint.by} (${hint.cost} Pkt.)` : hint.by,
                  )
                  .join(" · ")}
              </p>
            ) : null}
            {level.fails.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {level.fails.map((fail, index) => (
                  <li key={`${fail.at}-${index}`} className="text-xs text-slate-600">
                    Falsch von {fail.by}
                    {fail.role ? ` (${fail.role})` : ""}
                    {fail.answer ? `: „${fail.answer}“` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>

      {team.handoffs.length > 0 ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            An andere Rolle gegeben
          </p>
          <ul className="mt-2 space-y-1">
            {team.handoffs.map((handoff, index) => (
              <li key={`${handoff.at}-${index}`} className="text-sm text-slate-700">
                {handoff.fromName} → {handoff.toName}
                {handoff.bonusTitle ? ` · ${handoff.bonusTitle}` : ""}
                {handoff.level ? ` · Level ${handoff.level}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
