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
  GridHint,
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
  if (role === "Alpha") return "text-teal-700 bg-teal-50";
  if (role === "Beta") return "text-sky-700 bg-sky-50";
  return "text-slate-600 bg-slate-100";
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
        <GridHint tone="success">
          Spiel läuft — hier kannst du Rollen verwalten.{" "}
          <a
            href={eventPlayPath(inviteCode, joinCode)}
            className="font-medium text-emerald-700 underline underline-offset-2"
          >
            Zurück zum Spiel
          </a>
        </GridHint>
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
        <GridHint tone="info">
          {rosterFull ? (
            <>Team voll — Start in {countdown}…</>
          ) : (
            <>Auto-Start in {countdown} — oder der Team-Leiter startet manuell.</>
          )}
        </GridHint>
      ) : null}

      {isAlpha && isLobby && !canStart ? (
        <GridHint tone="warn">
          Mindestens ein Spieler muss im Team sein, bevor die Mission startet.
        </GridHint>
      ) : null}

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">Spieler im Team</p>
        <ul className="flex flex-col gap-2">
          {snapshot.players.map((player) => (
            <li
              key={player.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="font-medium text-slate-900">{player.display_name}</span>
                {player.id === session.playerId ? (
                  <span className="ml-2 text-xs text-slate-500">(Du)</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const role = playerRoleBadge(player);
                  return (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${playerRoleBadgeClass(role)}`}
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
                      className="text-xs font-medium text-teal-600 underline-offset-2 hover:underline"
                    >
                      Leitung übergeben
                    </button>
                    {!player.is_beta && snapshot.active_player_count >= 2 ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAssignBeta(player.id)}
                        className="text-xs font-medium text-sky-600 underline-offset-2 hover:underline"
                      >
                        Hinweise zuweisen
                      </button>
                    ) : null}
                    {player.is_beta && snapshot.active_player_count >= 3 ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAssignGamma(player.id)}
                        className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline"
                      >
                        Standard-Rolle
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemovePlayer(player.id)}
                      className="text-xs font-medium text-red-600 underline-offset-2 hover:underline"
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
            <p className="mb-3 text-sm font-medium text-slate-700">Mitspieler einladen</p>
            {manageMode && isPlaying ? (
              <p className="mb-3 text-sm text-slate-500">
                Neuer Spieler kann auch während der laufenden Mission beitreten.
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
        <p className="text-center text-sm text-slate-500">
          Warte auf den Team-Leiter oder den Auto-Start…
        </p>
      ) : null}

      {isLobby ? (
        <GridButton type="button" variant="ghost" disabled={isPending} onClick={handleHandover}>
          Gerät übergeben
        </GridButton>
      ) : null}

      {realtimeError ? <GridError message={realtimeError} /> : null}
      {error ? <GridError message={error} /> : null}
        </>
      )}
    </div>
  );
}
