"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import {
  applyGpsTestOverride,
  getEventCockpitSnapshot,
  operatorDisableLevelGps,
  operatorEnableLevelGps,
  operatorClearLevelOverride,
  operatorSetTeamNavigator,
} from "@/app/actions/cockpit";
import { CockpitLink } from "@/components/cockpit/cockpit-shell";
import { Panel, Stat } from "@/components/cms/ui";
import { useCockpitSync } from "@/lib/hooks/use-cockpit-sync";
import { queryKeys } from "@/lib/platform/query-keys";
import {
  IconArrowRight,
  IconMapPin,
} from "@/components/cms/studio-icons";
import {
  GridButton,
  GridError,
  GridInput,
  GridLabel,
  GridSuccess,
} from "@/components/grid/grid-shell";
import { cockpitShowPath, eventLobbyPath, eventPath } from "@/lib/grid/event-routes";

type EventCockpitProps = {
  inviteCode: string;
};

function statusLabel(status: string): string {
  if (status === "playing") return "Im Spiel";
  if (status === "finished") return "Beendet";
  if (status === "lobby") return "Lobby";
  return status;
}

export function EventCockpit({ inviteCode }: EventCockpitProps) {
  const queryClient = useQueryClient();
  const {
    data: snapshot = null,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.cockpit.snapshot(inviteCode),
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.cockpit.snapshot(inviteCode) });
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [radiusMeters, setRadiusMeters] = useState("50000");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [isPending, startTransition] = useTransition();

  const displayError = error ?? (queryError instanceof Error ? queryError.message : null);

  function invalidateSnapshot() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cockpit.snapshot(inviteCode) });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Standort wird von diesem Browser nicht unterstützt.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setMessage("Aktuelle Position übernommen.");
      },
      () => setError("Standort konnte nicht ermittelt werden."),
    );
  }

  function handleGpsTestAll() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await applyGpsTestOverride({
        inviteCode,
        radiusMeters: Number(radiusMeters) || 50_000,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(
        `GPS-Testmodus für Aufgaben ${result.data.gpsLevels.join(", ")} aktiv — Teams bitte Seite neu laden.`,
      );
      await invalidateSnapshot();
    });
  }

  function handleDisableLevel(level: number) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await operatorDisableLevelGps({ inviteCode, level });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(`Aufgabe ${level}: GPS aus — Teams bitte Seite neu laden.`);
      await invalidateSnapshot();
    });
  }

  function handleEnableLevel(level: number) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await operatorEnableLevelGps({
        inviteCode,
        level,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        radiusMeters: radiusMeters ? Number(radiusMeters) : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(`Aufgabe ${level}: GPS wieder aktiv — Teams bitte Seite neu laden.`);
      await invalidateSnapshot();
    });
  }

  function handleResetLevel(level: number) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await operatorClearLevelOverride({ inviteCode, level });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(`Aufgabe ${level}: Einstellungen zurückgesetzt.`);
      await invalidateSnapshot();
    });
  }

  function handleSetNavigator(joinCode: string, playerId: string) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await operatorSetTeamNavigator({
        inviteCode,
        joinCode,
        playerId,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(`Team ${joinCode}: Team-Leiter (GPS) → ${result.data.navigatorName}`);
      await invalidateSnapshot();
    });
  }

  if (!snapshot) {
    return <p className="text-sm text-muted-foreground">Cockpit wird geladen…</p>;
  }

  const sortedTeams = [...snapshot.teams].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Event" value={snapshot.title} />
        <Stat label="Status" value={statusLabel(snapshot.status)} />
        <Stat label="Teams" value={String(snapshot.teams.length)} />
        <Stat label="Code" value={snapshot.invite_code} />
      </div>

      <Panel title="Einstieg" subtitle="Spieler, Beamer und GRID Data — ohne neuen Write-Path.">
        <p className="text-sm text-muted-foreground">
          Spieler-Einstieg:{" "}
          <CockpitLink href={eventPath(snapshot.invite_code)}>
            /e/{snapshot.invite_code}
          </CockpitLink>
        </p>
        <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          Live-Ranking für Beamer:{" "}
          <CockpitLink href={cockpitShowPath(snapshot.invite_code)} external>
            /cockpit/{snapshot.invite_code}/show
          </CockpitLink>
          <IconArrowRight size={14} />
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nach Spielende:{" "}
          <CockpitLink href="/data">GRID Data</CockpitLink>
        </p>
      </Panel>

      {message ? <GridSuccess message={message} /> : null}
      {displayError ? <GridError message={displayError} /> : null}

      <Panel
        title="Health-Engine"
        subtitle="Radius-Fallback und Nudge laufen auf dem GPS-Lead-Gerät — ohne neuen FSM-Schritt. Manuelle Hebel bleiben unten unter Legacy."
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Hängt ein Team länger als 90 s knapp außerhalb des Geofence, erweitert das Lead-Handy den
          Radius schrittweise (max. 80 m) und zeigt einen In-App-Hinweis. Session-Handoff bleibt
          der bestehende Self-Heal-Pfad.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {sortedTeams.filter((team) => team.status === "playing").length === 0 ? (
            <li className="text-sm text-muted-foreground">Keine laufenden Teams — Heal greift im Live-Lauf.</li>
          ) : (
            sortedTeams
              .filter((team) => team.status === "playing")
              .map((team) => {
                const started = team.level_started_at
                  ? Date.parse(team.level_started_at)
                  : Number.NaN;
                const hanging =
                  team.current_phase === "hub" &&
                  Number.isFinite(started) &&
                  Date.now() - started > 90_000;
                return (
                  <li
                    key={team.id}
                    className="rounded-2xl bg-secondary px-4 py-3 text-sm"
                  >
                    <span className="font-bold">{team.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · Aufgabe {team.current_level || "—"} · {team.current_phase ?? "level"}
                      {hanging ? " · Lead-Heal sollte Radius erweitern" : " · im Radius-Fenster"}
                    </span>
                  </li>
                );
              })
          )}
        </ul>
      </Panel>

      <Panel
        title="Live-Ranking"
        subtitle="Aktuelle Punkte und Team-Status — aktualisiert live via Realtime."
      >
        <div className="flex flex-col gap-3">
          {sortedTeams.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Noch keine Teams — Spieler treten über den Event-Link bei.
            </p>
          ) : (
            sortedTeams.map((team, index) => (
              <div
                key={team.id}
                className={`rounded-2xl px-4 py-4 ${
                  index === 0 ? "bg-primary/10" : "bg-secondary"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      <span className="mr-2 text-primary">#{index + 1}</span>
                      {team.name}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({team.join_code})
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aufgabe {team.current_level || "—"} · {statusLabel(team.status)} ·{" "}
                      {team.active_player_count} Spieler · Leiter: {team.captain_name ?? "—"} · GPS:{" "}
                      {team.navigator_name ?? "—"}
                    </p>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-primary">{team.score}</p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <Link
                    href={eventLobbyPath(inviteCode, team.join_code, { manage: true })}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                  >
                    Team verwalten
                    <IconArrowRight size={12} />
                  </Link>
                  {team.players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      disabled={isPending || player.is_navigator}
                      onClick={() => handleSetNavigator(team.join_code, player.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                    >
                      <IconMapPin size={12} />
                      GPS → {player.display_name}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>

      <details className="group rounded-3xl bg-card p-5 shadow-soft">
        <summary className="cursor-pointer list-none text-sm font-bold">
          Legacy / Dev — manuelle GPS-Hebel
          <span className="ml-2 font-normal text-muted-foreground">
            (Test &amp; Notfall — nicht die Produktvision)
          </span>
        </summary>
        <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-bold">GPS steuern</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pro Aufgabe GPS ein- oder ausschalten. Nach Änderungen müssen Spieler die Spielseite neu laden.
        </p>
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div>
            <GridLabel hint="Für Testmodus und GPS-Aktivierung">Radius (Meter)</GridLabel>
            <GridInput
              value={radiusMeters}
              onChange={(event) => setRadiusMeters(event.target.value)}
              inputMode="numeric"
            />
          </div>
          <div>
            <GridLabel hint="Optional">Breitengrad</GridLabel>
            <GridInput value={lat} onChange={(event) => setLat(event.target.value)} />
          </div>
          <div>
            <GridLabel hint="Optional">Längengrad</GridLabel>
            <GridInput value={lng} onChange={(event) => setLng(event.target.value)} />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <GridButton
            type="button"
            variant="secondary"
            disabled={isPending}
            icon={<IconMapPin size={16} />}
            onClick={useMyLocation}
          >
            Meine Position
          </GridButton>
          <GridButton type="button" disabled={isPending} onClick={handleGpsTestAll}>
            Alle GPS-Aufgaben testen
          </GridButton>
        </div>

        <ul className="flex flex-col gap-2">
          {snapshot.levels.map((level) => (
            <li
              key={level.level}
              className="flex flex-col gap-3 rounded-2xl bg-secondary px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold">
                  Aufgabe {level.level} · {level.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {level.type === "gps" ? "GPS-Aufgabe" : "Ohne GPS"}
                  {level.has_override ? " · Sonder-Einstellung aktiv" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {level.type === "gps" || level.has_override ? (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDisableLevel(level.level)}
                      className="rounded-full bg-destructive/12 px-3 py-1.5 text-xs font-bold text-destructive"
                    >
                      GPS aus
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleEnableLevel(level.level)}
                      className="rounded-full bg-success/20 px-3 py-1.5 text-xs font-bold text-success-foreground"
                    >
                      GPS an
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleResetLevel(level.level)}
                      className="rounded-full bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground"
                    >
                      Zurücksetzen
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Keine GPS-Steuerung</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        </div>
      </details>
    </div>
  );
}
