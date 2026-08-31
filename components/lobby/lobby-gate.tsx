"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareTeamGame } from "@/app/actions/game";
import { getLobbySnapshot } from "@/app/actions/lobby";
import { LobbyRoom } from "@/components/lobby/lobby-room";
import { GridError } from "@/components/grid/grid-shell";
import { eventPlayPath, eventTeamJoinPath } from "@/lib/grid/event-routes";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
import { cacheEventContent } from "@/lib/grid/offline-content";
import type { RoleDisplayLabels } from "@/lib/grid/role-labels";
import {
  abandonTeamSession,
  resolveTeamSession,
} from "@/lib/grid/session-recovery";
import type { LobbySnapshot, PlayerSession } from "@/lib/grid/types";

type LobbyGateProps = {
  inviteCode: string;
  joinCode: string;
  manageMode?: boolean;
  eventTitle?: string;
  briefingIframeUrl?: string | null;
  roleLabels?: RoleDisplayLabels | null;
  studioTest?: boolean;
  eventContent?: ResolvedEventContent | null;
};

export function LobbyGate({
  inviteCode,
  joinCode,
  manageMode = false,
  eventTitle,
  briefingIframeUrl = null,
  roleLabels = null,
  studioTest = false,
  eventContent = null,
}: LobbyGateProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventContent) cacheEventContent(inviteCode, eventContent);
  }, [eventContent, inviteCode]);

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

        if (
          !manageMode &&
          (result.data.team_status === "playing" || result.data.team_status === "finished")
        ) {
          router.replace(eventPlayPath(inviteCode, joinCode));
          return;
        }

        setSnapshot(result.data);
        void prepareTeamGame({
          inviteCode,
          joinCode,
          sessionId: resolved.session.sessionId,
        });
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
      studioTest={studioTest}
    />
  );
}
