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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [countdown, setCountdown] = useState(
    formatCountdown(initialSnapshot.lobby_auto_start_at),
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!manageOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setManageOpen(false);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [manageOpen]);

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
  const playerCount = snapshot.active_player_count;
  const aloneNow = playerCount <= 1;
  const teamAllowsMore = snapshot.max_size > 1;
  const canManageRoles = isAlpha && (isLobby || manageMode) && !aloneNow;
  const canStart = playerCount >= 1;
  const canInviteTeammates =
    isAlpha &&
    teamAllowsMore &&
    playerCount < snapshot.max_size &&
    (isLobby || (manageMode && isPlaying));

  useEffect(() => {
    if (aloneNow) setManageOpen(false);
  }, [aloneNow]);

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
              {eventTitle ?? (aloneNow ? "Bereit machen" : "Wartebereich")}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">{snapshot.team_name}</p>
            <p className="mt-1 text-sm text-slate-600">
              {aloneNow
                ? `Hallo ${session.displayName} — lies kurz die Infos, dann kannst du starten.`
                : `Hallo ${session.displayName} · ${playerCount}/${snapshot.max_size} im Team`}
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
                {aloneNow
                  ? "Spielregeln anschauen — bevor der Countdown startet"
                  : "Regeln lesen — bevor der Countdown startet"}
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

          {isLobby && rosterFull && !aloneNow ? (
            <p className="text-center text-sm font-semibold text-teal-800">
              Team voll — Start in {countdown}
            </p>
          ) : null}

          {/* Team roster + roles only when more than one player is present */}
          {!aloneNow ? (
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
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {canInviteTeammates ? (
            aloneNow ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setInviteOpen((v) => !v)}
                  className="w-full text-center text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
                >
                  {inviteOpen ? "Einladen ausblenden" : "Optional: Mitspieler einladen"}
                </button>
                {inviteOpen && teammateUrl ? (
                  <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5">
                    <QrInviteImage url={teammateUrl} />
                    <CopyInviteLink url={teammateUrl} label="Einladungslink kopieren" />
                  </div>
                ) : null}
              </div>
            ) : (
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
            )
          ) : null}

          {isAlpha && isLobby ? (
            <GridButton
              type="button"
              className="py-4 text-base"
              disabled={isPending || !canStart}
              onClick={handleStartGame}
            >
              {isPending ? "Startet…" : aloneNow ? "Spiel starten" : "Spiel starten"}
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
                onClick={() => setManageOpen(true)}
                className="text-center text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
              >
                Rollen verwalten
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

          {manageOpen && canManageRoles ? (
            <div
              className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-6"
              onClick={() => setManageOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Rollen verwalten"
                className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:rounded-3xl sm:pb-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Rollen verwalten</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Wer führt, wer Hinweise sieht, wer Bonus macht
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManageOpen(false)}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"
                  >
                    Schließen
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
                  <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
                    <strong>{labels.alpha}</strong> startet &amp; GPS ·{" "}
                    <strong>{labels.beta}</strong> Hinweise ·{" "}
                    <strong>{labels.gamma}</strong> Bonusaufgaben
                  </p>

                  {snapshot.players.filter((p) => p.id !== session.playerId).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                      <p className="font-semibold text-slate-800">Noch keine Mitspieler</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Sobald jemand beitritt, kannst du hier Rollen zuweisen.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
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
                        const isMe = player.id === session.playerId;
                        const canEdit =
                          canManageRoles && !player.is_captain && !isMe;

                        return (
                          <li
                            key={player.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {player.display_name}
                                  {isMe ? (
                                    <span className="ml-1.5 text-xs font-medium text-slate-400">
                                      du
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-xs text-slate-500">{role}</p>
                              </div>
                            </div>
                            {canEdit ? (
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleTransferCaptain(player.id)}
                                  className="rounded-xl bg-teal-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  Leitung geben
                                </button>
                                {!player.is_beta && snapshot.active_player_count >= 2 ? (
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleAssignBeta(player.id)}
                                    className="rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                                  >
                                    → {labels.beta}
                                  </button>
                                ) : null}
                                {player.is_beta && snapshot.active_player_count >= 3 ? (
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleAssignGamma(player.id)}
                                    className="rounded-xl bg-slate-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                                  >
                                    → {labels.gamma}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleRemovePlayer(player.id)}
                                  className="rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-red-600 disabled:opacity-50"
                                >
                                  Entfernen
                                </button>
                              </div>
                            ) : isMe ? (
                              <p className="mt-2 text-xs text-slate-500">
                                Du bist die Team-Leitung.
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
