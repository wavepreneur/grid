"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Radar,
  ShieldCheck,
  Sparkles,
  Wifi,
  XCircle,
  Zap,
} from "lucide-react";
import {
  getOrgCockpitOverview,
  type CockpitHealthFlag,
  type CockpitOverviewSession,
} from "@/app/actions/cockpit-overview";
import { StudioPage } from "@/components/cms/studio-page";
import { Chip, Empty, Modal, Panel, Stat } from "@/components/cms/ui";
import { cockpitPath } from "@/lib/grid/event-routes";
import { queryKeys } from "@/lib/platform/query-keys";

const HEALING_LOOP = ["Signal erkannt", "Regel geprüft", "Eingriff ausgelöst", "Selbst geheilt"];

const HEALING_RULES = [
  {
    icon: Radar,
    signal: "GPS greift nicht / Ort ungenau",
    action:
      "Technik: Radius weitet sich am Lead-Gerät (nahe, aber draußen, max. +80 m). Spieler wählen: wir stehen davor → Alpha schaltet frei, oder GPS defekt → Einstellungen prüfen, ohne GPS weiter, in der Nähe bleiben.",
    live: true,
  },
  {
    icon: Activity,
    signal: "Keine Eingabe > 5 Minuten (Rätsel)",
    action:
      "Hinweis auf ungenutzten Tipp, sonst auf Freischalten / Lösung anzeigen. Nicht auf der Karte — Laufen zählt nicht als Hängen.",
    live: true,
  },
  {
    icon: XCircle,
    signal: "3 ähnliche Fehlversuche",
    action:
      "Hinweis auf Tipp, falls noch nicht gekauft. „Was ist los?“ und FAQ führen zu Freischalten — kein Ticket.",
    live: true,
  },
  {
    icon: Wifi,
    signal: "Netzstörung / anderes Gerät",
    action: "Session wiederherstellen, Weiterspiel-Link, Leitung übergeben. Menü → Team.",
    live: true,
  },
  {
    icon: Cpu,
    signal: "Verständnis / feststecken",
    action:
      "Auswahl im Spiel: GPS, Lösung, Verbindung, FAQ. Operator sieht hier die Regel — kein Fern-Support.",
    live: true,
  },
  {
    icon: Sparkles,
    signal: "Tempo weit über Schnitt",
    action: "Bonus-Impuls vorziehen — in Studio als Layer-3 hinterlegt.",
    live: false,
  },
];

const FLAG_INFO: Record<
  CockpitHealthFlag,
  { label: string; tone: string; Icon: typeof CheckCircle2 }
> = {
  ok: { label: "Stabil", tone: "bg-success/20 text-success-foreground", Icon: CheckCircle2 },
  haengt: { label: "Auto-Eingriff aktiv", tone: "bg-accent/30 text-accent-foreground", Icon: Zap },
  hilfe: { label: "System heilt", tone: "bg-primary/12 text-primary", Icon: ShieldCheck },
};

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;
}

function playerRole(player: CockpitOverviewSession["players"][number]) {
  if (player.isCaptain) return "Alpha";
  if (player.isNavigator) return "GPS";
  return "Team";
}

export function HealthEngineDashboard() {
  const { data, error, isPending } = useQuery({
    queryKey: queryKeys.cockpit.overview(),
    queryFn: async () => {
      const result = await getOrgCockpitOverview();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 8_000,
    refetchInterval: 12_000,
  });

  const [open, setOpen] = useState<CockpitOverviewSession | null>(null);

  return (
    <StudioPage
      eyebrow="Autonome Health-Engine"
      title="GRID Cockpit"
      description="Technik heilt sich selbst. Menschliche Störungen (Warten, falsche Antworten) bekommen im Spiel einen Klick-Hebel. Hier steht, was wirklich live ist — nicht die Roadmap als Fakt."
    >
      {isPending ? (
        <p className="text-sm text-muted-foreground">Live-Sessions werden gelesen…</p>
      ) : error || !data ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Cockpit konnte nicht geladen werden."}
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Self-Healing-Quote"
              value={formatPct(data.selfHealingPct)}
              note="Sessions ohne Operator-Hebel"
            />
            <Stat
              label="Menschliche Eingriffe"
              value={String(data.humanInterventions)}
              note={data.humanInterventions === 0 ? "Ziel-Vorgabe erfüllt" : "letzte 24 h · GPS/Navigator"}
            />
            <Stat
              label="Auto-Eingriffe"
              value={String(data.autoInterventions)}
              note={`${data.autoHealed} im Log · ${data.autoActive} auffällig`}
            />
            <Stat
              label="Sessions live"
              value={String(data.liveSessionCount)}
              note="playing · vollautomatisch"
            />
          </div>

          <Panel
            title="Self-Healing-Loop"
            subtitle="So greifen die Live-Regeln — ohne Operator-Ticket."
          >
            <div className="grid gap-2 sm:grid-cols-4">
              {HEALING_LOOP.map((step, index) => (
                <div key={step} className="rounded-2xl bg-secondary px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Schritt {index + 1}
                  </p>
                  <p className="mt-1 font-bold">{step}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Technik vs. Mensch"
            subtitle="Zwei Klassen von Störungen — beide enden in einem Klick, nicht in einem Ticket."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Technik
                </p>
                <p className="mt-1 text-sm">
                  GPS, Netz, Session, Multiplayer-Gerät. Heal läuft still (Radius, Restore) oder
                  über eine Auswahl: freischalten / Einstellungen / Team-Menü.
                </p>
              </div>
              <div className="rounded-2xl bg-secondary px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Mensch
                </p>
                <p className="mt-1 text-sm">
                  5 Minuten keine Eingabe im Rätsel, oder drei ähnliche Fehlversuche. Dann Tipp,
                  Freischalten oder FAQ — gebunden an die Bedingung, nicht an einen Operator.
                </p>
              </div>
            </div>
          </Panel>

          <Panel
            title="Aktive Regeln"
            subtitle="Genau das, was Spieler im Client sehen oder das Gerät selbst heilt. „Roadmap“ ist noch nicht im Spiel."
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {HEALING_RULES.map((rule) => (
                <div key={rule.signal} className="rounded-2xl bg-secondary px-4 py-3">
                  <p className="flex items-center gap-2 font-bold">
                    <rule.icon className="h-4 w-4 shrink-0 text-primary" /> {rule.signal}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{rule.action}</p>
                  <p className="mt-2">
                    <Chip tone={rule.live ? "bg-success/20 text-success-foreground" : "bg-card text-muted-foreground"}>
                      {rule.live ? "aktiv" : "Roadmap"}
                    </Chip>
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
            <Panel
              title="Sessions"
              subtitle="Telemetrie-Status. Antippen öffnet das Event-Cockpit."
            >
              {data.sessions.length === 0 ? (
                <Empty>
                  Keine Lobby- oder Live-Teams. Sobald ein Event läuft, erscheint es hier — der
                  Event-Code bleibt der Einstieg für Beamer und Legacy-GPS.
                </Empty>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {data.sessions.map((session) => {
                    const flag = FLAG_INFO[session.flag];
                    return (
                      <button
                        key={session.teamId}
                        type="button"
                        onClick={() => setOpen(session)}
                        className="tap-lift rounded-3xl bg-secondary p-4 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="mr-auto text-lg font-bold">{session.teamName}</span>
                          <Chip tone={flag.tone}>
                            <flag.Icon className="h-3.5 w-3.5" /> {flag.label}
                          </Chip>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {session.eventTitle} · Code {session.joinCode} · Aufgabe{" "}
                          {session.currentLevel || "—"}
                          {session.currentPhase ? ` · ${session.currentPhase}` : ""}
                        </p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {session.score} Punkte · {session.status === "playing" ? "im Spiel" : session.status === "lobby" ? "Lobby" : session.status}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {session.players.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Keine Spieler</span>
                          ) : (
                            session.players.map((player) => (
                              <span
                                key={`${session.teamId}-${player.name}`}
                                className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-semibold"
                              >
                                <span className="h-2 w-2 rounded-full bg-success" />
                                {player.name} · {playerRole(player)}
                              </span>
                            ))
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Panel>

            <div className="space-y-4">
              <Panel title="Auto-Eingriffe" subtitle="Was das System in den letzten 24 h selbst geregelt hat.">
                {data.healing.length === 0 ? (
                  <Empty>Keine Auto-Eingriffe im Log — die Sessions laufen ohne Störung oder der Heal greift still.</Empty>
                ) : (
                  <ul className="space-y-2">
                    {data.healing.map((row) => (
                      <li key={row.id} className="rounded-2xl bg-secondary px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="mr-auto text-sm font-bold">{row.teamName}</span>
                          <Chip tone="bg-success/20 text-success-foreground">selbst geheilt</Chip>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {formatClock(row.at)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                          {row.rule}
                        </p>
                        <p className="mt-1 text-sm">{row.signal}</p>
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-primary">
                          <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {row.intervention}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Telemetrie-Strom" subtitle="Rohsignal — fließt direkt in GRID Data.">
                {data.telemetry.length === 0 ? (
                  <Empty>Noch keine Solve-Events in den letzten 24 Stunden.</Empty>
                ) : (
                  <ul className="space-y-2">
                    {data.telemetry.map((row) => (
                      <li
                        key={row.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary px-4 py-3"
                      >
                        {row.ok ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {row.teamName} · {row.playerName}
                            {row.role ? ` (${row.role})` : ""}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {row.stage} · „{row.input}“
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {formatClock(row.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </div>
      )}

      {open ? (
        <Modal
          wide
          title={open.teamName}
          subtitle={`${open.eventTitle} · Code ${open.joinCode} · Aufgabe ${open.currentLevel || "—"}`}
          onClose={() => setOpen(null)}
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Punkte" value={String(open.score)} />
              <Stat label="Status" value={open.status === "playing" ? "Im Spiel" : open.status === "lobby" ? "Lobby" : open.status} />
              <Stat label="Health" value={FLAG_INFO[open.flag].label} />
            </div>
            <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
              Manuelle Fernhilfe bleibt Legacy. Radius-Heal läuft auf dem GPS-Lead-Gerät. GPS-Hebel
              für Tests liegen im Event-Cockpit unter Legacy / Dev.
            </p>
            {open.inviteCode ? (
              <Link
                href={cockpitPath(open.inviteCode)}
                className="tap-lift inline-flex rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
              >
                Zum Event-Cockpit
              </Link>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </StudioPage>
  );
}
