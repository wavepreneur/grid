"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getLobbySnapshot,
  startGameManually,
} from "@/app/actions/lobby";
import {
  CopyInviteLink,
  QrInviteImage,
} from "@/components/grid/copy-invite-link";
import {
  GridButton,
  GridError,
  GridStat,
} from "@/components/grid/grid-shell";
import { useTeamSync } from "@/lib/hooks/use-team-sync";
import { buildTeamInviteUrl } from "@/lib/grid/codes";
import type { LobbySnapshot, PlayerSession } from "@/lib/grid/types";

type LobbyRoomProps = {
  inviteCode: string;
  joinCode: string;
  initialSnapshot: LobbySnapshot;
  playerSession: PlayerSession;
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
}: LobbyRoomProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(
    formatCountdown(initialSnapshot.lobby_auto_start_at),
  );
  const [isPending, startTransition] = useTransition();

  const teammateUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return buildTeamInviteUrl(window.location.origin, inviteCode, joinCode);
  }, [inviteCode, joinCode]);

  const refreshLobby = useCallback(async () => {
    const result = await getLobbySnapshot({
      inviteCode,
      joinCode,
      sessionId: playerSession.sessionId,
    });

    if (result.success) {
      setSnapshot(result.data);
      setCountdown(formatCountdown(result.data.lobby_auto_start_at));
    }
  }, [inviteCode, joinCode, playerSession.sessionId]);

  const handleTeamStatusChange = useCallback(
    (status: string) => {
      if (status === "playing") {
        router.push(`/play/${inviteCode}/${joinCode}`);
        return;
      }

      void refreshLobby();
    },
    [inviteCode, joinCode, refreshLobby, router],
  );

  const handlePlayersChange = useCallback((players: LobbySnapshot["players"]) => {
    setSnapshot((current) => ({
      ...current,
      players,
      active_player_count: players.length,
    }));
  }, []);

  const { isConnected, error: realtimeError } = useTeamSync({
    sessionId: playerSession.sessionId,
    teamId: playerSession.teamId,
    enabled: snapshot.team_status === "lobby",
    onTeamStatusChange: handleTeamStatusChange,
    onPlayersChange: handlePlayersChange,
  });

  useEffect(() => {
    if (snapshot.team_status !== "lobby") return;

    const countdownId = window.setInterval(() => {
      setCountdown(formatCountdown(snapshot.lobby_auto_start_at));
    }, 1000);

    const autoStartCheckId = window.setInterval(() => {
      void refreshLobby();
    }, 5000);

    return () => {
      window.clearInterval(countdownId);
      window.clearInterval(autoStartCheckId);
    };
  }, [refreshLobby, snapshot.lobby_auto_start_at, snapshot.team_status]);

  function handleStartGame() {
    setError(null);

    startTransition(async () => {
      const result = await startGameManually({
        inviteCode,
        joinCode,
        sessionId: playerSession.sessionId,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/play/${inviteCode}/${joinCode}`);
    });
  }

  const isCaptain = playerSession.isCaptain;
  const isLobby = snapshot.team_status === "lobby";

  return (
    <div className="flex flex-col gap-6">
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
          Auto-Start in {countdown} — oder Captain startet manuell.
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
              className="flex items-center justify-between rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-3 text-sm"
            >
              <span className="text-white">{player.display_name}</span>
              {player.is_captain ? (
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--grid-accent)]">
                  Captain
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {isCaptain && isLobby ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
              Teammates einladen
            </p>
            {teammateUrl ? (
              <>
                <CopyInviteLink url={teammateUrl} />
                <div className="mt-4">
                  <QrInviteImage url={teammateUrl} />
                </div>
              </>
            ) : null}
          </div>

          <GridButton type="button" disabled={isPending} onClick={handleStartGame}>
            {isPending ? "Startet…" : "Spiel jetzt starten"}
          </GridButton>
        </div>
      ) : null}

      {!isCaptain && isLobby ? (
        <p className="text-center text-sm text-[var(--grid-muted)]">
          Warte auf den Captain oder den Auto-Start-Timer…
        </p>
      ) : null}

      {realtimeError ? <GridError message={realtimeError} /> : null}
      {error ? <GridError message={error} /> : null}
    </div>
  );
}
