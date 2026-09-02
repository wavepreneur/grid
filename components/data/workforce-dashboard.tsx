"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Gauge, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import { getWorkforceDashboard, type WorkforceTeamCard } from "@/app/actions/data";
import { Bar, Chip, Empty, Panel, Stat } from "@/components/cms/ui";
import {
  PERFORMANCE_INDEXES,
  deriveReportSignals,
  deriveStrengthBlindspot,
} from "@/lib/grid/data-indices";
import { queryKeys } from "@/lib/platform/query-keys";

const RAW_SIGNALS = [
  { label: "Lösungszeiten", text: "Vom Öffnen der Aufgabe bis zur belastbaren Entscheidung." },
  { label: "Fehlversuche", text: "Anzahl falscher Eingaben unter Druck." },
  { label: "Tippnutzung", text: "Werden Tipps früh, spät oder gar nicht gekauft?" },
  { label: "Tempo vs. GRID-Feld", text: "Schwankung gegenüber der Pilot-Baseline — kein gelieferter Branchenschnitt." },
  { label: "Rollenverteilung", text: "Anteil der Lösungen je Alpha, Beta, Gamma." },
  { label: "Ausdauer", text: "Recovery und Trefferquote bis zum Finale." },
];

function delta(n: number) {
  const d = Math.round(n);
  return d > 0 ? `+${d}` : String(d);
}

function formatFinished(iso: string | null) {
  if (!iso) return "bei Spielende";
  return new Date(iso).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function indexValue(
  team: WorkforceTeamCard,
  key: (typeof PERFORMANCE_INDEXES)[number]["key"],
) {
  return team.scores[key];
}

export function WorkforceDashboard() {
  const { data, error, isPending } = useQuery({
    queryKey: queryKeys.data.dashboard(),
    queryFn: async () => {
      const result = await getWorkforceDashboard();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 30_000,
  });

  const [openId, setOpenId] = useState<string | null>(null);

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Indizes werden aus Spiel-Logs gelesen…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "GRID Data konnte nicht geladen werden."}
      </p>
    );
  }

  const selected =
    data.teams.find((team) => team.teamId === openId) ?? data.teams[0] ?? null;
  const avgScore = Math.round(
    data.teams.reduce((sum, team) => sum + (team.compositeScore ?? 0), 0) /
      Math.max(1, data.teams.filter((team) => team.compositeScore !== null).length),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Auto-Auswertungen"
          value={String(data.teams.length)}
          note="bei Spielende erzeugt"
        />
        <Stat
          label="Ø Team-Score"
          value={data.teams.some((team) => team.compositeScore !== null) ? String(avgScore) : "—"}
          note="von 100 · aus den drei Indizes"
        />
        <Stat label="Indizes je Team" value="3" note="vollautomatisch" />
        <Stat label="Manuelle Arbeit" value="0 Min" note="Zero-Ops-Auswertung" />
      </div>

      <Panel
        title="B2B-Performance-Indizes"
        subtitle="Aus Roh-Telemetrie berechnet, gegen das GRID-Feld gestellt — kein gelieferter Branchenschnitt."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {PERFORMANCE_INDEXES.map((index) => (
            <div key={index.key} className="rounded-2xl bg-secondary px-4 py-3">
              <p className="flex items-center gap-2 font-bold">
                <Gauge className="h-4 w-4 text-primary" /> {index.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{index.text}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                GRID-Feld {data.fieldBaseline[index.key]}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Event-Benchmark"
        subtitle="Aggregiert über alle beendeten Teams eines Events."
      >
        {data.eventBenchmarks.length === 0 ? (
          <Empty>Noch keine beendeten Teams in dieser Organisation.</Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.eventBenchmarks.map((event) => (
              <div key={event.inviteCode || event.eventTitle} className="rounded-3xl bg-secondary p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-auto flex items-center gap-2 text-lg font-bold">
                    <Building2 className="h-4 w-4 text-primary" /> {event.eventTitle}
                  </span>
                  <Chip tone="bg-primary/12 text-primary">{event.teamCount} Teams</Chip>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vergleich gegen GRID-Feld, nicht gegen eine Branche.
                </p>
                <div className="mt-3 space-y-3">
                  {PERFORMANCE_INDEXES.map((index) => {
                    const val = event.indexes[index.key];
                    const baseline = data.fieldBaseline[index.key];
                    const d = val === null ? 0 : val - baseline;
                    return (
                      <div key={index.key}>
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span>{index.label}</span>
                          <span className={val === null ? "text-muted-foreground" : d >= 0 ? "text-success" : "text-destructive"}>
                            {val ?? "—"}
                            {val !== null ? ` (${delta(d)} vs. Feld)` : ""}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Bar
                            value={val ?? 0}
                            tone={val === null ? "bg-muted-foreground/30" : d >= 0 ? "bg-success" : "bg-accent"}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Woraus GRID Data rechnet" subtitle="Rohsignale aus dem Spielverlauf — automatisch erhoben.">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {RAW_SIGNALS.map((row) => (
            <div key={row.label} className="rounded-2xl bg-secondary px-4 py-3">
              <p className="font-bold">{row.label}</p>
              <p className="text-sm text-muted-foreground">{row.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Panel title="Teams">
          {data.teams.length === 0 ? (
            <Empty>
              Sobald ein Lauf auf finished steht, erscheint das Benchmark-Dashboard hier.
            </Empty>
          ) : (
            <ul className="space-y-2">
              {data.teams.map((team) => {
                const active = selected?.teamId === team.teamId;
                return (
                  <li key={team.teamId}>
                    <button
                      type="button"
                      onClick={() => setOpenId(team.teamId)}
                      className={`tap-lift w-full rounded-2xl px-4 py-3 text-left ${
                        active ? "bg-primary text-primary-foreground" : "bg-secondary"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="mr-auto font-bold">{team.teamName}</span>
                        <span className="text-lg font-bold tabular-nums">
                          {team.compositeScore ?? "—"}
                        </span>
                      </span>
                      <span className={`block text-xs ${active ? "opacity-80" : "opacity-80 text-muted-foreground"}`}>
                        {team.eventTitle} · {formatFinished(team.finishedAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {selected ? (
          <TeamBenchmarkPanel team={selected} baseline={data.fieldBaseline} />
        ) : (
          <Panel title="Benchmark-Dashboard">
            <Empty>Team auswählen, um die Auswertung zu sehen.</Empty>
          </Panel>
        )}
      </div>
    </div>
  );
}

function TeamBenchmarkPanel({
  team,
  baseline,
}: {
  team: WorkforceTeamCard;
  baseline: typeof import("@/lib/grid/data-indices").GRID_FIELD_BASELINE;
}) {
  const signals = deriveReportSignals(team.scores);
  const copy = deriveStrengthBlindspot(team.scores);

  return (
    <Panel
      title={`Benchmark-Dashboard · ${team.teamName}`}
      subtitle={`${team.eventTitle} · ${formatFinished(team.finishedAt)} · automatisch bei Spielende`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="bg-primary/12 text-primary">
            Team-Score {team.compositeScore ?? "—"}/100
          </Chip>
          <Chip>{team.score} Spielpunkte</Chip>
          <Chip tone="bg-success/20 text-success-foreground">automatisch erzeugt</Chip>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {PERFORMANCE_INDEXES.map((index) => {
            const val = indexValue(team, index.key);
            const d = val === null ? 0 : val - baseline[index.key];
            return (
              <div key={index.key} className="rounded-2xl bg-secondary px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {index.label}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{val ?? "—"}</p>
                <p
                  className={`text-xs font-bold ${
                    val === null ? "text-muted-foreground" : d >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {val === null ? "zu wenig Telemetrie" : `${delta(d)} vs. GRID-Feld ${baseline[index.key]}`}
                </p>
                <div className="mt-2">
                  <Bar
                    value={val ?? 0}
                    tone={val === null ? "bg-muted-foreground/30" : d >= 0 ? "bg-success" : "bg-accent"}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          {signals.map((signal) => (
            <div key={signal.key}>
              <div className="flex items-center justify-between text-sm font-bold">
                <span>{signal.label}</span>
                <span className="tabular-nums">{signal.value}</span>
              </div>
              <div className="mt-1">
                <Bar
                  value={signal.value}
                  tone={
                    signal.value >= 70 ? "bg-success" : signal.value >= 50 ? "bg-accent" : "bg-destructive"
                  }
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{signal.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl bg-success/15 p-4">
            <p className="flex items-center gap-2 font-bold">
              <Sparkles className="h-4 w-4" /> Stärke
            </p>
            <p className="mt-1 text-sm">{copy.strength}</p>
          </div>
          <div className="rounded-2xl bg-destructive/12 p-4">
            <p className="flex items-center gap-2 font-bold">
              <TriangleAlert className="h-4 w-4" /> Blind Spot
            </p>
            <p className="mt-1 text-sm">{copy.blindspot}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-secondary p-4">
          <p className="flex items-center gap-2 font-bold">
            <TrendingUp className="h-4 w-4 text-primary" /> Automatische Folge-Empfehlung
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Folge-Trigger (Micro-Pulse / Slack) liegen im Spiel-Snapshot in Studio. Billing und
            Ausspielung bleiben bei Exitmania bzw. Tabbrain — GRID speichert nur die Kopplung.
          </p>
        </div>
      </div>
    </Panel>
  );
}
