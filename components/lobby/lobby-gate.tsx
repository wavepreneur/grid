"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLobbySnapshot } from "@/app/actions/lobby";
import { LobbyRoom } from "@/components/lobby/lobby-room";
import { GridError } from "@/components/grid/grid-shell";
import { eventPlayPath, eventTeamJoinPath } from "@/lib/grid/event-routes";
import {
  abandonTeamSession,
  resolveTeamSession,
} from "@/lib/grid/session-recovery";
import type { RoleDisplayLabels } from "@/lib/grid/role-labels";
import type { LobbySnapshot, PlayerSession } from "@/lib/grid/types";

type LobbyGateProps = {
  inviteCode: string;
  joinCode: string;
  manageMode?: boolean;
  eventTitle?: string;
  briefingIframeUrl?: string | null;
  roleLabels?: RoleDisplayLabels | null;
};

export function LobbyGate({
  inviteCode,
  joinCode,
  manageMode = false,
  eventTitle,
  briefingIframeUrl = null,
  roleLabels = null,
}: LobbyGateProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveTeamSession(inviteCode, joinCode).then((resolved) => {
      if (!resolved) {
        abandonTeamSession();
        router.replace(eventTeamJoinPath(inviteCode, joinCode));
        return;
      }

      setSession(resolved.session);

      const isPlaying =
        resolved.session.teamStatus === "playing" ||
        resolved.session.teamStatus === "finished";

      if (isPlaying && !manageMode) {
        router.replace(eventPlayPath(inviteCode, joinCode));
        return;
      }

      getLobbySnapshot({
        inviteCode,
        joinCode,
        sessionId: resolved.session.sessionId,
      }).then((result) => {
        if (!result.success) {
          setError(result.error);
          return;
        }

        setSnapshot(result.data);
      });
    });
  }, [inviteCode, joinCode, manageMode, router]);

  if (error) {
    return <GridError message={error} />;
  }

  if (!session || !snapshot) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">Wartebereich wird geladen…</p>
    );
  }

  return (
    <LobbyRoom
      inviteCode={inviteCode}
      joinCode={joinCode}
      initialSnapshot={snapshot}
      playerSession={session}
      manageMode={manageMode}
      eventTitle={eventTitle}
      briefingIframeUrl={briefingIframeUrl}
      roleLabels={roleLabels}
    />
  );
}
