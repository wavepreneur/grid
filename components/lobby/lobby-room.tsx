"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignPlayerRole,
  getLobbySnapshot,
  handoverSession,
  removePlayerFromLobby,
  startGameManually,
  transferCaptain,
  verifyTeamSession,
} from "@/app/actions/lobby";
import {
  CopyInviteLink,
  QrInviteImage,
} from "@/components/grid/copy-invite-link";
import { IdentityBar } from "@/components/player/identity-bar";
import { SessionHandoffScreen } from "@/components/player/session-handoff-screen";
import {
  GridButton,
  GridError,
  GridStat,
} from "@/components/grid/grid-shell";
import { eventPlayPath, eventTeamJoinPath } from "@/lib/grid/event-routes";
import { useTeamSync } from "@/lib/hooks/use-team-sync";
import { buildTeamInviteUrl } from "@/lib/grid/codes";
import { isLobbyRosterFull } from "@/lib/grid/lobby-auto-start";
import { archetypeRoleLabel } from "@/lib/grid/archetype-roles";
import { clearPlayerSession, savePlayerSession } from "@/lib/grid/player-session";
import type { LobbySnapshot, PlayerSession } from "@/lib/grid/types";

type LobbyRoomProps = {
  inviteCode: string;
  joinCode: string;
  initialSnapshot: LobbySnapshot;
  playerSession: PlayerSession;
  manageMode?: boolean;
};

function formatCountdown(targetIso: string | null): string {
  if (!targetIso) return "—";
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return "00:00";
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function playerRoleBadge(player: LobbySnapshot["players"][number]): string {
  if (player.archetype_role) {
    return archetypeRoleLabel(player.archetype_role);
  }
  if (player.is_alpha || player.is_captain) return "Alpha";
  if (player.is_beta) return "Beta";
  if (player.is_gamma) return "Gamma";
  return "Gamma";
}

function playerRoleBadgeClass(role: string): string {
  if (role === "Alpha") return "text-[var(--grid-accent)]";
  if (role === "Beta") return "text-sky-300";
  return "text-[var(--grid-muted)]";
}

export function LobbyRoom({
  inviteCode,
  joinCode,
  initialSnapshot,
  playerSession,
  manageMode = false,
}: LobbyRoomProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [session, setSession] = useState(playerSession);
  const [sessionSuperseded, setSessionSuperseded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(
    formatCountdown(initialSnapshot.lobby_auto_start_at),
  );
  const [isPending, startTransition] = useTransition();

  const rosterFull = isLobbyRosterFull(snapshot);

  const teammateUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return buildTeamInviteUrl(window.location.origin, inviteCode, joinCode);
  }, [inviteCode, joinCode]);

  const refreshLobby = useCallback(async () => {
    const result = await getLobbySnapshot({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
    });

    if (result.success) {
      setSnapshot(result.data);
      setCountdown(formatCountdown(result.data.lobby_auto_start_at));
    }
  }, [inviteCode, joinCode, session.sessionId]);

  async function syncSessionFromServer() {
    const verified = await verifyTeamSession({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
    });

    if (verified.success) {
      savePlayerSession(verified.data.session);
      setSession(verified.data.session);
    }
  }

  const handleTeamStatusChange = useCallback(
    (status: string) => {
      if (status === "playing" && !manageMode) {
        router.push(eventPlayPath(inviteCode, joinCode));
        return;
      }

      void refreshLobby();
    },
    [inviteCode, joinCode, manageMode, refreshLobby, router],
  );

  const handlePlayersChange = useCallback((players: LobbySnapshot["players"]) => {
    setSnapshot((current) => ({
      ...current,
      players,
      active_player_count: players.length,
    }));
  }, []);

  const { isConnected, error: realtimeError } = useTeamSync({
    sessionId: session.sessionId,
    teamId: session.teamId,
    playerId: session.playerId,
    enabled: !sessionSuperseded && (snapshot.team_status === "lobby" || manageMode),
    onTeamStatusChange: handleTeamStatusChange,
    onPlayersChange: handlePlayersChange,
    onSessionSuperseded: () => setSessionSuperseded(true),
  });

  useEffect(() => {
    if (snapshot.team_status !== "lobby") return;

    const countdownId = window.setInterval(() => {
      setCountdown(formatCountdown(snapshot.lobby_auto_start_at));
    }, 1000);

    const autoStartCheckId = window.setInterval(() => {
      void refreshLobby();
    }, rosterFull ? 1000 : 5000);

    return () => {
      window.clearInterval(countdownId);
      window.clearInterval(autoStartCheckId);
    };
  }, [refreshLobby, rosterFull, snapshot.lobby_auto_start_at, snapshot.team_status]);

  function handleStartGame() {
    setError(null);

    startTransition(async () => {
      const result = await startGameManually({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(eventPlayPath(inviteCode, joinCode));
    });
  }

  function handleHandover() {
    setError(null);

    startTransition(async () => {
      const result = await handoverSession({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      clearPlayerSession();
      router.replace(eventTeamJoinPath(inviteCode, joinCode));
    });
  }

  function handleTransferCaptain(targetPlayerId: string) {
    setError(null);

    startTransition(async () => {
      const result = await transferCaptain({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
        targetPlayerId,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      await refreshLobby();
      await syncSessionFromServer();
    });
  }

  function handleAssignBeta(targetPlayerId: string) {
    setError(null);

    startTransition(async () => {
      const result = await assignPlayerRole({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
        targetPlayerId,
        role: "beta",
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      await refreshLobby();
      await syncSessionFromServer();
    });
  }

  function handleAssignGamma(targetPlayerId: string) {
    setError(null);

    startTransition(async () => {
      const result = await assignPlayerRole({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
        targetPlayerId,
        role: "gamma",
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      await refreshLobby();
      await syncSessionFromServer();
    });
  }

  function handleRemovePlayer(targetPlayerId: string) {
    setError(null);

    startTransition(async () => {
      const result = await removePlayerFromLobby({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
        targetPlayerId,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      await refreshLobby();
    });
  }

  const isAlpha = session.canManageTeam;
  const isLobby = snapshot.team_status === "lobby";
  const isPlaying = snapshot.team_status === "playing";
  const canManageRoles = isAlpha && (isLobby || manageMode);
  const minPlayersToStart = 1;
  const canStart = snapshot.active_player_count >= minPlayersToStart;
  const canInviteTeammates =
    isAlpha &&
    snapshot.active_player_count < snapshot.max_size &&
    (isLobby || (manageMode && isPlaying));

  return (
    <div className="flex flex-col gap-6">
      <IdentityBar
        inviteCode={inviteCode}
        joinCode={joinCode}
        session={session}
        showManageTeam={!manageMode}
      />

      {sessionSuperseded ? (
        <SessionHandoffScreen
          inviteCode={inviteCode}
          joinCode={joinCode}
          playerId={session.playerId}
          displayName={session.displayName}
        />
      ) : (
        <>
      {manageMode && isPlaying ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          Spiel läuft — hier Rollen verwalten (Alpha, Beta, Gamma).{" "}
          <a
            href={eventPlayPath(inviteCode, joinCode)}
            className="underline underline-offset-2"
          >
            Zurück zum Spiel
          </a>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <GridStat label="Team" value={snapshot.team_name} />
        <GridStat
          label="Spieler"
          value={`${snapshot.active_player_count} / ${snapshot.max_size}`}
        />
        <GridStat label="Abteilung" value={snapshot.department ?? "—"} />
        <GridStat
          label="Realtime"
          value={isConnected ? "Live verbunden" : "Verbinde…"}
        />
      </div>

      {isLobby ? (
        <div className="rounded-xl border border-[var(--grid-accent)]/30 bg-[var(--grid-accent)]/10 px-4 py-3 text-sm text-[var(--grid-accent)]">
          {rosterFull ? (
            <>Team voll — Start in {countdown}…</>
          ) : (
            <>Auto-Start in {countdown} — oder Alpha startet manuell, sobald alle da sind.</>
          )}
        </div>
      ) : null}

      {isAlpha && isLobby && !canStart ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Mindestens ein Spieler muss im Team sein, bevor die Mission startet.
        </div>
      ) : null}

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
          Lobby
        </p>
        <ul className="flex flex-col gap-2">
          {snapshot.players.map((player) => (
            <li
              key={player.id}
              className="flex flex-col gap-2 rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="text-white">{player.display_name}</span>
                {player.id === session.playerId ? (
                  <span className="ml-2 text-xs text-[var(--grid-muted)]">(Du)</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const role = playerRoleBadge(player);
                  return (
                    <span
                      className={`text-xs uppercase tracking-[0.16em] ${playerRoleBadgeClass(role)}`}
                    >
                      {role}
                    </span>
                  );
                })()}
                {canManageRoles && !player.is_captain && player.id !== session.playerId ? (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleTransferCaptain(player.id)}
                      className="text-xs text-[var(--grid-accent)] underline-offset-2 hover:underline"
                    >
                      Alpha übertragen
                    </button>
                    {!player.is_beta && snapshot.active_player_count >= 2 ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAssignBeta(player.id)}
                        className="text-xs text-sky-300 underline-offset-2 hover:underline"
                      >
                        Beta zuweisen
                      </button>
                    ) : null}
                    {player.is_beta && snapshot.active_player_count >= 3 ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAssignGamma(player.id)}
                        className="text-xs text-[var(--grid-muted)] underline-offset-2 hover:underline"
                      >
                        Gamma setzen
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemovePlayer(player.id)}
                      className="text-xs text-red-300 underline-offset-2 hover:underline"
                    >
                      Entfernen
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {canInviteTeammates ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
              Teammates einladen
            </p>
            {manageMode && isPlaying ? (
              <p className="mb-3 text-sm text-[var(--grid-muted)]">
                Neuer Spieler kann auch während der laufenden Mission beitreten und wird automatisch
                Beta oder Gamma zugewiesen.
              </p>
            ) : null}
            {teammateUrl ? (
              <>
                <CopyInviteLink url={teammateUrl} />
                <div className="mt-4">
                  <QrInviteImage url={teammateUrl} />
                </div>
              </>
            ) : null}
          </div>

          {isLobby ? (
            <GridButton
              type="button"
              disabled={isPending || !canStart}
              onClick={handleStartGame}
            >
              {isPending ? "Startet…" : "Spiel jetzt starten"}
            </GridButton>
          ) : null}
        </div>
      ) : null}

      {!isAlpha && isLobby ? (
        <p className="text-center text-sm text-[var(--grid-muted)]">
          Warte auf Alpha oder den Auto-Start-Timer…
        </p>
      ) : null}

      {isLobby ? (
        <GridButton
          type="button"
          className="border-[var(--grid-border)] bg-transparent text-[var(--grid-muted)] hover:bg-black/20"
          disabled={isPending}
          onClick={handleHandover}
        >
          Gerät übergeben / Platz freigeben
        </GridButton>
      ) : null}

      {realtimeError ? <GridError message={realtimeError} /> : null}
      {error ? <GridError message={error} /> : null}
        </>
      )}
    </div>
  );
}
