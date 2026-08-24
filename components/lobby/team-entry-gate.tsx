"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { joinTeamAsPlayer } from "@/app/actions/lobby";
import {
  GridButton,
  GridError,
  GridHint,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";
import { SESSION_ACTIVE } from "@/lib/grid/session-codes";
import {
  abandonTeamSession,
  resolveTeamSession,
} from "@/lib/grid/session-recovery";
import { teamEntryPath } from "@/lib/grid/team-routes";
import { savePlayerSession } from "@/lib/grid/player-session";
import type { GridTeamStatus } from "@/lib/grid/types";

type TeamEntryGateProps = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
  teamStatus: GridTeamStatus;
  defaultDisplayName?: string;
};

export function TeamEntryGate({
  inviteCode,
  joinCode,
  teamName,
  teamStatus,
  defaultDisplayName = "",
}: TeamEntryGateProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [checkingSession, setCheckingSession] = useState(true);
  const [pendingTakeover, setPendingTakeover] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isMidGame = teamStatus === "playing" || teamStatus === "finished";

  useEffect(() => {
    resolveTeamSession(inviteCode, joinCode).then((resolved) => {
      if (resolved) {
        router.replace(resolved.path);
        return;
      }

      abandonTeamSession();
      setCheckingSession(false);
    });
  }, [inviteCode, joinCode, router]);

  function completeJoin(takeover: boolean) {
    setError(null);

    startTransition(async () => {
      const result = await joinTeamAsPlayer({
        inviteCode,
        joinCode,
        displayName,
        takeover,
      });

      if (!result.success) {
        if (result.code === SESSION_ACTIVE) {
          setPendingTakeover(displayName.trim());
          setError(null);
          return;
        }
        setPendingTakeover(null);
        setError(result.error);
        return;
      }

      savePlayerSession(result.data);
      const path = teamEntryPath(
        inviteCode,
        joinCode,
        result.data.teamStatus ?? teamStatus,
      );
      router.replace(path);
    });
  }

  if (checkingSession) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">Einen Moment…</p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-sm leading-relaxed text-slate-500">
        Du trittst Team <strong className="text-slate-800">{teamName}</strong> bei.
        {isMidGame
          ? " Das Spiel läuft schon — danach springst du direkt ein."
          : " Wähle einen Namen, den die anderen erkennen."}
      </p>

      {pendingTakeover ? (
        <GridHint tone="warn">
          <p className="font-medium">„{pendingTakeover}“ ist schon angemeldet</p>
          <p className="mt-2 leading-6">
            Möchtest du hier weiterspielen? Das andere Gerät wird abgemeldet.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <GridButton type="button" disabled={isPending} onClick={() => completeJoin(true)}>
              {isPending ? "Übernehme…" : "Hier weiterspielen"}
            </GridButton>
            <GridButton
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                setPendingTakeover(null);
                setError(null);
              }}
            >
              Abbrechen
            </GridButton>
          </div>
        </GridHint>
      ) : (
        <>
          <div>
            <GridLabel>Dein Name</GridLabel>
            <GridInput
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="z. B. Pixel-Ranger"
              required
              minLength={2}
              maxLength={32}
              className="text-base"
            />
          </div>

          {error ? <GridError message={error} /> : null}

          <GridButton
            type="button"
            className="py-4 text-base"
            disabled={isPending || displayName.trim().length < 2}
            onClick={() => completeJoin(false)}
          >
            {isPending
              ? "Tritt bei…"
              : isMidGame
                ? "Weiterspielen"
                : "Team beitreten"}
          </GridButton>
        </>
      )}
    </div>
  );
}

export const MemberJoinForm = TeamEntryGate;
