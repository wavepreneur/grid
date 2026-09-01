"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { LobbyBusyOverlay } from "@/components/lobby/lobby-busy-overlay";
import { GameGateSkeleton } from "@/components/game/game-gate-skeleton";
import {
  CopyInviteLink,
  QrInviteImage,
} from "@/components/grid/copy-invite-link";
import { PlayDocSheet } from "@/components/game/play-doc-sheet";
import { SessionHandoffScreen } from "@/components/player/session-handoff-screen";
import { PersonalResumeLinkCard } from "@/components/player/personal-resume-link-card";
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
import {
  applyCaptainTransferToPlayers,
  applyRosterToSession,
  rosterNeedsSessionSync,
  rosterWithHeldCaptain,
  sessionAfterCaptainTransfer,
} from "@/lib/grid/live-session";
import { nextLeadSeq, noteLeadSeq, parseLeadSeq } from "@/lib/grid/lead-seq";
import {
  clearMissionStarting,
  markMissionStarting,
  missionStartProgress,
} from "@/lib/grid/mission-start-signal";
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
  /** Studio test sessions may invite freely; live bookings are capped by paid seats. */
  studioTest?: boolean;
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
  studioTest = false,
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
  const [busy, setBusy] = useState<{
    title: string;
    subtitle?: string;
    variant?: "start";
  } | null>(null);
  const [startProgress, setStartProgress] = useState(8);
  const holdCaptainIdRef = useRef<string | null>(null);
  const holdSeqRef = useRef(0);
  const startInFlightRef = useRef(false);

  function applyHeldLead(playerId: string, seq: number): boolean {
    if (seq < holdSeqRef.current) return false;
    noteLeadSeq(seq);
    holdSeqRef.current = seq;
    holdCaptainIdRef.current = playerId;
    return true;
  }

  function applyLeadToUi(playerId: string) {
    setSnapshot((current) => ({
      ...current,
      captain_player_id: playerId,
      navigator_player_id: playerId,
      players: applyCaptainTransferToPlayers(current.players, playerId),
    }));
    setSession((current) => {
      const next = sessionAfterCaptainTransfer(current, playerId);
      savePlayerSession(next);
      return next;
    });
  }

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

  useEffect(() => {
    router.prefetch(eventPlayPath(inviteCode, joinCode));
  }, [inviteCode, joinCode, router]);

  const goToPlay = useCallback(() => {
    if (manageMode) return;
    markMissionStarting(inviteCode, joinCode);
    setBusy({
      title: "Alle Geräte laden…",
      subtitle: "Die Mission startet gemeinsam — niemand legt allein los.",
      variant: "start",
    });
    router.replace(eventPlayPath(inviteCode, joinCode));
  }, [inviteCode, joinCode, manageMode, router]);

  useEffect(() => {
    if (busy?.variant !== "start") return;
    setStartProgress(missionStartProgress(inviteCode, joinCode));
    const id = window.setInterval(() => {
      setStartProgress(missionStartProgress(inviteCode, joinCode));
    }, 80);
    return () => window.clearInterval(id);
  }, [busy?.variant, inviteCode, joinCode]);

  const refreshLobby = useCallback(async () => {
    const result = await getLobbySnapshot({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
    });

    if (!result.success) return;

    // Polling often sees "playing" before/without Realtime — never leave the lobby stuck.
    if (
      !manageMode &&
      (result.data.team_status === "playing" || result.data.team_status === "finished")
    ) {
      goToPlay();
      return;
    }

    const heldId = holdCaptainIdRef.current;
    const players = rosterWithHeldCaptain(result.data.players, heldId);

    setSnapshot({ ...result.data, players });
    setCountdown(formatCountdown(result.data.lobby_auto_start_at));
  }, [goToPlay, inviteCode, joinCode, manageMode, session.sessionId]);

  const syncSessionFromServer = useCallback(async () => {
    const verified = await verifyTeamSession({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
    });

    if (verified.success) {
      const held = holdCaptainIdRef.current;
      if (held) {
        const shouldBeLead = verified.data.session.playerId === held;
        const isLead =
          verified.data.session.isCaptain || verified.data.session.isAlpha;
        if (isLead !== shouldBeLead) {
          return;
        }
      }
      savePlayerSession(verified.data.session);
      setSession(verified.data.session);
    }
  }, [inviteCode, joinCode, session.sessionId]);

  const handleTeamStatusChange = useCallback(
    (status: string) => {
      if (status === "playing" || status === "finished") {
        goToPlay();
        return;
      }

      void refreshLobby();
      void syncSessionFromServer();
    },
    [goToPlay, refreshLobby, syncSessionFromServer],
  );

  const handlePlayersChange = useCallback(
    (players: LobbySnapshot["players"]) => {
      const heldId = holdCaptainIdRef.current;
      const nextPlayers = rosterWithHeldCaptain(players, heldId);

      setSnapshot((current) => ({
        ...current,
        players: nextPlayers,
        active_player_count: nextPlayers.length,
      }));

      const me = nextPlayers.find((player) => player.id === session.playerId);
      if (!me) return;

      setSession((current) => {
        const next = applyRosterToSession(current, me);
        if (next !== current) savePlayerSession(next);
        return next;
      });

      if (rosterNeedsSessionSync(session, me) && !holdCaptainIdRef.current) {
        void syncSessionFromServer();
      }
    },
    [session, syncSessionFromServer],
  );

  const { error: realtimeError, statusHint: realtimeHint, broadcast } = useTeamSync({
    sessionId: session.sessionId,
    teamId: session.teamId,
    playerId: session.playerId,
    // Keep sync alive until we leave the lobby route — disabling on status flip
    // used to drop the "playing" redirect when only the poll noticed the start.
    enabled: !sessionSuperseded,
    onTeamStatusChange: handleTeamStatusChange,
    onPlayersChange: handlePlayersChange,
    onSyncEvent: (event) => {
      if (event.event_type === "game_started" || event.event_type === "game_finished") {
        goToPlay();
        return;
      }
      if (event.event_type === "captain_transferred") {
        const newCaptainId = String(event.payload.new_captain_id ?? "");
        if (!newCaptainId) return;
        const seq = parseLeadSeq(event.payload.seq);
        if (!seq) {
          if (holdCaptainIdRef.current) return;
          if (!applyHeldLead(newCaptainId, nextLeadSeq())) return;
        } else if (!applyHeldLead(newCaptainId, seq)) {
          return;
        }
        applyLeadToUi(newCaptainId);
      }
    },
    onSessionSuperseded: () => setSessionSuperseded(true),
    onResynced: () => {
      void refreshLobby();
      void syncSessionFromServer();
    },
  });

  // Belt-and-suspenders: any path that marks the snapshot as playing must leave the lobby.
  useEffect(() => {
    if (snapshot.team_status === "playing" || snapshot.team_status === "finished") {
      goToPlay();
    }
  }, [goToPlay, snapshot.team_status]);

  useEffect(() => {
    if (snapshot.team_status !== "lobby") return;

    const countdownId = window.setInterval(() => {
      setCountdown(formatCountdown(snapshot.lobby_auto_start_at));
    }, 1000);

    // Always poll quickly in lobby — manual start must reach other phones within ~1s.
    const autoStartCheckId = window.setInterval(() => {
      void refreshLobby();
    }, 1000);

    return () => {
      window.clearInterval(countdownId);
      window.clearInterval(autoStartCheckId);
    };
  }, [refreshLobby, snapshot.lobby_auto_start_at, snapshot.team_status]);

  function handleStartGame() {
    if (startInFlightRef.current) return;
    startInFlightRef.current = true;
    setError(null);

    const startedAt = new Date().toISOString();
    void broadcast({ type: "game_started", started_at: startedAt });
    void startGameManually({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
    }).then((result) => {
      if (!result.success) {
        startInFlightRef.current = false;
        clearMissionStarting(inviteCode, joinCode);
        setBusy(null);
        setError(result.error);
        return;
      }
      if (manageMode) {
        startInFlightRef.current = false;
        setBusy(null);
      }
    });

    goToPlay();
  }

  function handleHandover() {
    setError(null);
    setBusy({
      title: "Platz wird freigegeben…",
      subtitle: "Du kannst dich danach erneut anmelden.",
    });

    void handoverSession({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
    }).then((result) => {
      if (!result.success) {
        setBusy(null);
        setError(result.error);
        return;
      }

      clearPlayerSession();
      router.replace(eventTeamJoinPath(inviteCode, joinCode));
    });
  }

  function handleTransferCaptain(targetPlayerId: string) {
    setError(null);
    setManageOpen(false);
    const seq = nextLeadSeq();
    if (!applyHeldLead(targetPlayerId, seq)) return;
    applyLeadToUi(targetPlayerId);

    void broadcast({
      type: "captain_transferred",
      new_captain_id: targetPlayerId,
      previous_captain_id: session.playerId,
      seq,
    });

    void transferCaptain({
      inviteCode,
      joinCode,
      sessionId: session.sessionId,
      targetPlayerId,
      seq,
    }).then((result) => {
      if (!result.success) {
        setError(result.error);
        void refreshLobby();
        return;
      }
      const committedSeq = result.data.seq;
      const committedId = result.data.newCaptainId;
      if (!applyHeldLead(committedId, committedSeq)) return;
      if (committedId !== targetPlayerId) {
        applyLeadToUi(committedId);
      }
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

  const meLive = snapshot.players.find((player) => player.id === session.playerId);
  const isAlpha =
    session.canManageTeam ||
    Boolean(meLive?.is_captain) ||
    Boolean(meLive?.is_alpha);
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
  // Live: no solo “optional invite” — seats are paid/booked; joining uses the booking flow.
  // Studio test: keep optional invite so you can pull devices into the lobby.
  const showSoloInvite = canInviteTeammates && aloneNow && studioTest;
  const showTeamInvite = canInviteTeammates && !aloneNow;
  const showAutoStartCountdown =
    isLobby && Boolean(snapshot.lobby_auto_start_at) && countdown !== "—";
  const autoStartMsLeft = snapshot.lobby_auto_start_at
    ? new Date(snapshot.lobby_auto_start_at).getTime() - Date.now()
    : null;
  const autoStartSoon =
    typeof autoStartMsLeft === "number" && autoStartMsLeft > 0 && autoStartMsLeft <= 30_000;

  useEffect(() => {
    if (aloneNow) setManageOpen(false);
  }, [aloneNow]);

  return (
    <div className="flex flex-col gap-5">
      {busy?.variant === "start" ? (
        <div className="fixed inset-0 z-[200] bg-[var(--cg-bg,#f7f4ee)]">
          <GameGateSkeleton
            title="Alle Geräte laden…"
            subtitle="Die Mission startet gemeinsam — niemand legt allein los."
            progress={startProgress}
          />
        </div>
      ) : busy ? (
        <LobbyBusyOverlay title={busy.title} subtitle={busy.subtitle} />
      ) : null}
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

          <PersonalResumeLinkCard
            inviteCode={inviteCode}
            joinCode={joinCode}
            sessionId={session.sessionId}
          />

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
                {showAutoStartCountdown
                  ? `Regeln lesen — Start in ${countdown}`
                  : aloneNow
                    ? "Spielregeln anschauen — bevor es losgeht"
                    : "Regeln lesen — bevor es losgeht"}
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

          {showAutoStartCountdown ? (
            <div
              className={`rounded-2xl px-4 py-4 text-center ${
                rosterFull || autoStartSoon
                  ? "bg-teal-600 text-white shadow-sm"
                  : "border border-teal-200 bg-teal-50 text-teal-950"
              }`}
              role="timer"
              aria-live="polite"
            >
              <p
                className={`text-xs font-bold uppercase tracking-[0.16em] ${
                  rosterFull || autoStartSoon ? "text-teal-100" : "text-teal-700"
                }`}
              >
                {rosterFull ? "Team voll — Automatischer Start" : "Automatischer Start"}
              </p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight">
                {countdown}
              </p>
              <p
                className={`mt-1 text-sm ${
                  rosterFull || autoStartSoon ? "text-teal-50" : "text-teal-800/80"
                }`}
              >
                {isAlpha
                  ? "Du kannst auch früher starten."
                  : "Die Team-Leitung kann auch früher starten."}
              </p>
            </div>
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

          {showSoloInvite ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setInviteOpen((v) => !v)}
                className="w-full text-center text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
              >
                {inviteOpen ? "Einladen ausblenden" : "Optional: Mitspieler einladen (Test)"}
              </button>
              {inviteOpen && teammateUrl ? (
                <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5">
                  <QrInviteImage url={teammateUrl} />
                  <CopyInviteLink url={teammateUrl} label="Einladungslink kopieren" />
                </div>
              ) : null}
            </div>
          ) : null}

          {showTeamInvite ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5">
              <p className="text-center text-sm font-semibold text-slate-800">
                Freunde einladen
              </p>
              <p className="text-center text-xs text-slate-500">
                Noch {snapshot.max_size - playerCount} von {snapshot.max_size} Plätzen frei
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
              disabled={Boolean(busy) || isPending || !canStart}
              onClick={handleStartGame}
            >
              {busy?.variant === "start" ? "Startet…" : aloneNow ? "Spiel starten" : "Spiel starten"}
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
            {(isLobby || manageMode) ? (
              <GridButton type="button" variant="ghost" disabled={Boolean(busy) || isPending} onClick={handleHandover}>
                Platz freigeben
              </GridButton>
            ) : null}
          </div>

          {realtimeHint ? (
            <p className="text-center text-xs text-slate-500">{realtimeHint}</p>
          ) : null}
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
                                  disabled={Boolean(busy) || isPending}
                                  onClick={() => handleTransferCaptain(player.id)}
                                  className="rounded-xl bg-teal-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  Leitung geben
                                </button>
                                {!player.is_beta && snapshot.active_player_count >= 2 ? (
                                  <button
                                    type="button"
                                    disabled={Boolean(busy) || isPending}
                                    onClick={() => handleAssignBeta(player.id)}
                                    className="rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                                  >
                                    → {labels.beta}
                                  </button>
                                ) : null}
                                {player.is_beta && snapshot.active_player_count >= 3 ? (
                                  <button
                                    type="button"
                                    disabled={Boolean(busy) || isPending}
                                    onClick={() => handleAssignGamma(player.id)}
                                    className="rounded-xl bg-slate-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                                  >
                                    → {labels.gamma}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={Boolean(busy) || isPending}
                                  onClick={() => handleRemovePlayer(player.id)}
                                  className="rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-red-600 disabled:opacity-50"
                                >
                                  Platz freigeben
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
