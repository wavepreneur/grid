"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  applyGpsTestOverride,
  getEventCockpitSnapshot,
  operatorDisableLevelGps,
  operatorEnableLevelGps,
  operatorClearLevelOverride,
  operatorSetTeamNavigator,
  type EventCockpitSnapshot,
} from "@/app/actions/cockpit";
import { CockpitLink, CockpitSection } from "@/components/cockpit/cockpit-shell";
import {
  IconArrowRight,
  IconMapPin,
  IconUsers,
} from "@/components/cms/studio-icons";
import {
  GridButton,
  GridError,
  GridHint,
  GridInput,
  GridLabel,
  GridStat,
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
  const [snapshot, setSnapshot] = useState<EventCockpitSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [radiusMeters, setRadiusMeters] = useState("50000");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const result = await getEventCockpitSnapshot(inviteCode);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSnapshot(result.data);
    setError(null);
  }, [inviteCode]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

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
      await refresh();
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
      await refresh();
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
      await refresh();
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
      await refresh();
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
      await refresh();
    });
  }

  if (!snapshot) {
    return <p className="text-sm text-slate-500">Cockpit wird geladen…</p>;
  }

  const sortedTeams = [...snapshot.teams].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <GridStat label="Event" value={snapshot.title} />
        <GridStat label="Status" value={statusLabel(snapshot.status)} />
        <GridStat label="Teams" value={String(snapshot.teams.length)} />
        <GridStat label="Code" value={snapshot.invite_code} />
      </div>

      <GridHint tone="info">
        <p>
          Spieler-Einstieg:{" "}
          <CockpitLink href={eventPath(snapshot.invite_code)}>
            /e/{snapshot.invite_code}
          </CockpitLink>
        </p>
        <p className="mt-2 inline-flex items-center gap-1">
          Live-Ranking für Beamer:{" "}
          <CockpitLink href={cockpitShowPath(snapshot.invite_code)} external>
            /cockpit/{snapshot.invite_code}/show
          </CockpitLink>
          <IconArrowRight size={14} />
        </p>
      </GridHint>

      {message ? <GridSuccess message={message} /> : null}
      {error ? <GridError message={error} /> : null}

      <CockpitSection
        icon={<IconUsers size={18} />}
        title="Live-Ranking"
        description="Aktuelle Punkte und Team-Status — aktualisiert alle 5 Sekunden."
      >
        <div className="flex flex-col gap-3">
          {sortedTeams.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Noch keine Teams — Spieler treten über den Event-Link bei.
            </p>
          ) : (
            sortedTeams.map((team, index) => (
              <div
                key={team.id}
                className={`rounded-xl border px-4 py-4 ${
                  index === 0
                    ? "border-teal-200 bg-teal-50/50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      <span className="mr-2 text-teal-600">#{index + 1}</span>
                      {team.name}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        ({team.join_code})
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Aufgabe {team.current_level || "—"} · {statusLabel(team.status)} ·{" "}
                      {team.active_player_count} Spieler · Leiter: {team.captain_name ?? "—"} · GPS:{" "}
                      {team.navigator_name ?? "—"}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums text-teal-700">{team.score}</p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <Link
                    href={eventLobbyPath(inviteCode, team.join_code, { manage: true })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
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
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-40"
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
      </CockpitSection>

      <CockpitSection
        icon={<IconMapPin size={18} />}
        title="GPS steuern"
        description="Pro Aufgabe GPS ein- oder ausschalten. Nach Änderungen müssen Spieler die Spielseite neu laden."
      >
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
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">
                  Aufgabe {level.level} · {level.title}
                </p>
                <p className="text-xs text-slate-500">
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
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      GPS aus
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleEnableLevel(level.level)}
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      GPS an
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleResetLevel(level.level)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Zurücksetzen
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">Keine GPS-Steuerung</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CockpitSection>
    </div>
  );
}
