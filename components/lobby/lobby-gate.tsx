"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventContent } from "@/app/actions/content";
import { prepareTeamGame } from "@/app/actions/game";
import { getLobbySnapshot, rewindUnplayedStudioTestToLobby } from "@/app/actions/lobby";
import { LobbyRoom } from "@/components/lobby/lobby-room";
import { GridError, GridLink } from "@/components/grid/grid-shell";
import {
  eventPlayPath,
  eventTeamJoinPath,
} from "@/lib/grid/event-routes";
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

const SNAPSHOT_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

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
  const routerRef = useRef(router);
  routerRef.current = router;
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isStudio = studioTest || Boolean(eventContent?.isStudioTest || eventContent?.holdForBriefing);

  useEffect(() => {
    if (eventContent) cacheEventContent(inviteCode, eventContent);
  }, [eventContent, inviteCode]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const resolved = await withTimeout(
          resolveTeamSession(inviteCode, joinCode),
          SNAPSHOT_TIMEOUT_MS,
          "Wartebereich antwortet nicht.",
        );
        if (cancelled) return;

        if (!resolved) {
          if (isStudio) {
            setError("Session nicht gefunden. Bitte Namen erneut eingeben.");
            return;
          }
          abandonTeamSession();
          routerRef.current.replace(eventTeamJoinPath(inviteCode, joinCode));
          return;
        }

        setSession(resolved.session);

        const teamStatus = resolved.session.teamStatus;
        const isPlaying = teamStatus === "playing" || teamStatus === "finished";

        // Studio tests only leave this screen via Start in LobbyRoom.
        if (isPlaying && !manageMode && !isStudio) {
          routerRef.current.replace(eventPlayPath(inviteCode, joinCode));
          return;
        }

        if (isStudio && teamStatus === "playing" && !manageMode) {
          await rewindUnplayedStudioTestToLobby({
            inviteCode,
            joinCode,
            sessionId: resolved.session.sessionId,
          });
        }

        const result = await withTimeout(
          getLobbySnapshot({
            inviteCode,
            joinCode,
            sessionId: resolved.session.sessionId,
          }),
          SNAPSHOT_TIMEOUT_MS,
          "Wartebereich antwortet nicht.",
        );
        if (cancelled) return;

        if (!result.success) {
          setError(result.error);
          return;
        }

        if (
          !manageMode &&
          !isStudio &&
          (result.data.team_status === "playing" || result.data.team_status === "finished")
        ) {
          routerRef.current.replace(eventPlayPath(inviteCode, joinCode));
          return;
        }

        setSnapshot(result.data);
        void prepareTeamGame({
          inviteCode,
          joinCode,
          sessionId: resolved.session.sessionId,
        });
        void getEventContent(inviteCode).then((contentResult) => {
          if (!contentResult.success || cancelled) return;
          const { eventId: _eventId, contentRevision: _revision, ...content } =
            contentResult.data;
          cacheEventContent(inviteCode, content);
        });
      } catch (bootError) {
        if (cancelled) return;
        setError(
          bootError instanceof Error
            ? bootError.message
            : "Wartebereich konnte nicht geladen werden.",
        );
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [inviteCode, isStudio, joinCode, manageMode]);

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <GridError message={error} />
        <GridLink href={eventTeamJoinPath(inviteCode, joinCode)}>
          Zurück zur Namenseingabe
        </GridLink>
      </div>
    );
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
      studioTest={isStudio}
    />
  );
}
