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
import { PlayDocSheet } from "@/components/game/play-doc-sheet";
import { SessionHandoffScreen } from "@/components/player/session-handoff-screen";
import {
  GridButton,
  GridError,
  GridHint,
} from "@/components/grid/grid-shell";
import { eventPlayPath, eventTeamJoinPath } from "@/lib/grid/event-routes";
import { useTeamSync } from "@/lib/hooks/use-team-sync";
import { buildTeamInviteUrl } from "@/lib/grid/codes";
import { isLobbyRosterFull } from "@/lib/grid/lobby-auto-start";
import {
  displayRoleLabel,
  DEFAULT_ROLE_LABELS,
  type RoleDisplayLabels,
} from "@/lib/grid/role-labels";
import { clearPlayerSession, savePlayerSession } from "@/lib/grid/player-session";
import type { LobbySnapshot, PlayerSession } from "@/lib/grid/types";

type LobbyRoomProps = {
  inviteCode: string;
  joinCode: string;
  initialSnapshot: LobbySnapshot;
  playerSession: PlayerSession;
  manageMode?: boolean;
  eventTitle?: string;
  briefingIframeUrl?: string | null;
  roleLabels?: RoleDisplayLabels | null;
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

export function LobbyRoom({
  inviteCode,
  joinCode,
  initialSnapshot,
  playerSession,
  manageMode = false,
  eventTitle,
  briefingIframeUrl = null,
  roleLabels = null,
}: LobbyRoomProps) {
  const router = useRouter();
  const labels = roleLabels ?? DEFAULT_ROLE_LABELS;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [session, setSession] = useState(playerSession);
  const [sessionSuperseded, setSessionSuperseded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
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
        router.replace(eventPlayPath(inviteCode, joinCode));
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

  const { error: realtimeError } = useTeamSync({
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

      router.replace(eventPlayPath(inviteCode, joinCode));
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
  const canStart = snapshot.active_player_count >= 1;
  const canInviteTeammates =
    isAlpha &&
    snapshot.active_player_count < snapshot.max_size &&
    (isLobby || (manageMode && isPlaying));

  return (
    <div className="flex flex-col gap-5">
      <PlayDocSheet
        open={briefingOpen}
        title="Kurzinformationen"
        url={briefingIframeUrl}
        emptyHint="Für dieses Spiel ist noch kein Briefing-Link hinterlegt. Du findest die Infos später auch im Spielmenü."
        onClose={() => setBriefingOpen(false)}
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
          <div className="rounded-2xl bg-teal-50/80 px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              {eventTitle ?? "Wartebereich"}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">{snapshot.team_name}</p>
            <p className="mt-1 text-sm text-slate-600">
              Hallo {session.displayName} · {snapshot.active_player_count}/
              {snapshot.max_size} bereit
            </p>
          </div>

          <button
            type="button"
            onClick={() => setBriefingOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-teal-300"
          >
            <span>
              <span className="block text-base font-bold text-slate-900">
                Kurzinformationen
              </span>
              <span className="mt-0.5 block text-sm text-slate-500">
                Regeln lesen — bevor der Countdown startet
              </span>
            </span>
            <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-bold text-white">
              Lesen
            </span>
          </button>

          {manageMode && isPlaying ? (
            <GridHint tone="success">
              Spiel läuft.{" "}
              <a
                href={eventPlayPath(inviteCode, joinCode)}
                className="font-medium text-emerald-700 underline underline-offset-2"
              >
                Zurück zum Spiel
              </a>
            </GridHint>
          ) : null}

          {isLobby && rosterFull ? (
            <p className="text-center text-sm font-semibold text-teal-800">
              Team voll — Start in {countdown}
            </p>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Euer Team</p>
            <ul className="flex flex-col gap-2">
              {snapshot.players.map((player) => {
                const role = displayRoleLabel(
                  player.archetype_role ??
                    (player.is_alpha || player.is_captain
                      ? "alpha"
                      : player.is_beta
                        ? "beta"
                        : "gamma"),
                  labels,
                );
                return (
                  <li
                    key={player.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {player.display_name}
                        {player.id === session.playerId ? (
                          <span className="ml-1.5 text-xs font-medium text-slate-400">
                            du
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500">{role}</p>
                    </div>
                    {canManageRoles && manageOpen && !player.is_captain && player.id !== session.playerId ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleTransferCaptain(player.id)}
                          className="text-xs font-medium text-teal-700"
                        >
                          Leitung
                        </button>
                        {!player.is_beta && snapshot.active_player_count >= 2 ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleAssignBeta(player.id)}
                            className="text-xs font-medium text-sky-700"
                          >
                            Hinweise
                          </button>
                        ) : null}
                        {player.is_beta && snapshot.active_player_count >= 3 ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleAssignGamma(player.id)}
                            className="text-xs font-medium text-slate-500"
                          >
                            Standard
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRemovePlayer(player.id)}
                          className="text-xs font-medium text-red-600"
                        >
                          Entfernen
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          {canInviteTeammates ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5">
              <p className="text-center text-sm font-semibold text-slate-800">
                Freunde einladen
              </p>
              {teammateUrl ? (
                <>
                  <QrInviteImage url={teammateUrl} />
                  <CopyInviteLink url={teammateUrl} label="Einladungslink kopieren" />
                </>
              ) : null}
            </div>
          ) : null}

          {isAlpha && isLobby ? (
            <GridButton
              type="button"
              className="py-4 text-base"
              disabled={isPending || !canStart}
              onClick={handleStartGame}
            >
              {isPending ? "Startet…" : "Spiel starten"}
            </GridButton>
          ) : null}

          {!isAlpha && isLobby ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-4 text-center text-sm text-slate-600">
              Warte auf den Start durch die Team-Leitung — nutze die Zeit für die
              Kurzinformationen.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            {canManageRoles ? (
              <button
                type="button"
                onClick={() => setManageOpen((v) => !v)}
                className="text-center text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
              >
                {manageOpen ? "Rollen-Verwaltung ausblenden" : "Rollen verwalten"}
              </button>
            ) : null}
            {isLobby ? (
              <GridButton type="button" variant="ghost" disabled={isPending} onClick={handleHandover}>
                Gerät übergeben
              </GridButton>
            ) : null}
          </div>

          {realtimeError ? <GridError message={realtimeError} /> : null}
          {error ? <GridError message={error} /> : null}
        </>
      )}
    </div>
  );
}
