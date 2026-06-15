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
import {
  GridButton,
  GridError,
  GridInput,
  GridLabel,
  GridStat,
} from "@/components/grid/grid-shell";
import { cockpitShowPath, eventLobbyPath, eventPath } from "@/lib/grid/event-routes";

type EventCockpitProps = {
  inviteCode: string;
};

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
      setError("Geolocation wird von diesem Browser nicht unterstützt.");
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
        `GPS-Testmodus für Level ${result.data.gpsLevels.join(", ")} aktiv. Teams: Seite neu laden.`,
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
      setMessage(`Level ${level}: GPS aus — Antwort „skip“. Teams: Seite neu laden.`);
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
      setMessage(`Level ${level}: GPS wieder aktiv. Teams: Seite neu laden.`);
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
      setMessage(`Level ${level}: Override zurückgesetzt.`);
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

      setMessage(`Team ${joinCode}: Team Lead (GPS) → ${result.data.navigatorName}`);
      await refresh();
    });
  }

  if (!snapshot) {
    return <p className="text-sm text-[var(--grid-muted)]">Cockpit wird geladen…</p>;
  }

  const sortedTeams = [...snapshot.teams].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <GridStat label="Event" value={snapshot.title} />
        <GridStat label="Status" value={snapshot.status} />
        <GridStat label="Teams" value={String(snapshot.teams.length)} />
        <GridStat label="Code" value={snapshot.invite_code} />
      </div>

      <div className="rounded-xl border border-[var(--grid-accent)]/20 bg-[var(--grid-accent)]/5 p-4 text-sm text-[var(--grid-muted)]">
        <p>
          Spieler-Einstieg:{" "}
          <Link href={eventPath(snapshot.invite_code)} className="text-[var(--grid-accent)] hover:underline">
            /e/{snapshot.invite_code}
          </Link>
        </p>
        <p className="mt-2">
          Live-Ranking (Beamer):{" "}
          <Link href={cockpitShowPath(snapshot.invite_code)} className="text-emerald-300 hover:underline">
            /cockpit/{snapshot.invite_code}/show
          </Link>
        </p>
      </div>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <GridError message={error} /> : null}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Live-Highscore</h2>
        <div className="flex flex-col gap-3">
          {sortedTeams.length === 0 ? (
            <p className="text-sm text-[var(--grid-muted)]">Noch keine Teams.</p>
          ) : (
            sortedTeams.map((team, index) => (
              <div
                key={team.id}
                className="rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-white">
                      #{index + 1} {team.name}{" "}
                      <span className="text-xs text-[var(--grid-muted)]">({team.join_code})</span>
                    </p>
                    <p className="mt-1 text-xs text-[var(--grid-muted)]">
                      Level {team.current_level || "—"} · {team.status} · {team.active_player_count}{" "}
                      Spieler · Captain: {team.captain_name ?? "—"} · GPS:{" "}
                      {team.navigator_name ?? "—"}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold text-[var(--grid-accent)]">{team.score}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={eventLobbyPath(inviteCode, team.join_code, { manage: true })}
                    className="text-xs text-emerald-300 underline-offset-2 hover:underline"
                  >
                    Team verwalten
                  </Link>
                  {team.players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      disabled={isPending || player.is_navigator}
                      onClick={() => handleSetNavigator(team.join_code, player.id)}
                      className="rounded-lg border border-[var(--grid-border)] px-2 py-1 text-xs text-[var(--grid-muted)] hover:border-emerald-400/40 hover:text-emerald-300 disabled:opacity-40"
                    >
                      GPS → {player.display_name}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">GPS steuern</h2>
        <p className="mb-4 text-sm text-[var(--grid-muted)]">
          Pro Level GPS an/aus — ohne JSON. Nach Änderungen müssen Spieler die Spielseite neu laden.
        </p>

        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div>
            <GridLabel>Radius (Meter)</GridLabel>
            <GridInput
              value={radiusMeters}
              onChange={(event) => setRadiusMeters(event.target.value)}
              inputMode="numeric"
            />
          </div>
          <div>
            <GridLabel>Latitude (optional)</GridLabel>
            <GridInput value={lat} onChange={(event) => setLat(event.target.value)} />
          </div>
          <div>
            <GridLabel>Longitude (optional)</GridLabel>
            <GridInput value={lng} onChange={(event) => setLng(event.target.value)} />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <GridButton type="button" disabled={isPending} onClick={useMyLocation}>
            Meine Position übernehmen
          </GridButton>
          <GridButton type="button" disabled={isPending} onClick={handleGpsTestAll}>
            Alle GPS-Level testen (Radius)
          </GridButton>
        </div>

        <ul className="flex flex-col gap-2">
          {snapshot.levels.map((level) => (
            <li
              key={level.level}
              className="flex flex-col gap-3 rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-white">
                  Level {level.level} · {level.title}
                </p>
                <p className="text-xs text-[var(--grid-muted)]">
                  Typ: {level.type}
                  {level.has_override ? " · Override aktiv" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {level.type === "gps" || level.has_override ? (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDisableLevel(level.level)}
                      className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-300 hover:bg-red-400/10"
                    >
                      GPS aus
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleEnableLevel(level.level)}
                      className="rounded-lg border border-emerald-400/30 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-400/10"
                    >
                      GPS an
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleResetLevel(level.level)}
                      className="rounded-lg border border-[var(--grid-border)] px-3 py-1 text-xs text-[var(--grid-muted)]"
                    >
                      Reset
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-[var(--grid-muted)]">Kein GPS-Level</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
