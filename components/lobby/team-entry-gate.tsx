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
import { IconArrowRight } from "@/components/cms/studio-icons";
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
      router.push(path);
    });
  }

  if (checkingSession) {
    return <p className="text-sm text-slate-500">Sitzung wird wiederhergestellt…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <GridHint tone="info">
        <p>
          Team <strong>{teamName}</strong>
        </p>
        <p className="mt-2 text-xs leading-6">
          Dein Name ist deine Spieler-ID im Team. Nach einem Refresh erkennt GRID dich automatisch
          wieder.
        </p>
        {isMidGame ? (
          <p className="mt-2 font-medium text-teal-700">
            Das Spiel läuft — du springst direkt zum aktuellen Stand ein.
          </p>
        ) : null}
      </GridHint>

      {pendingTakeover ? (
        <GridHint tone="warn">
          <p className="font-medium">„{pendingTakeover}" ist bereits aktiv</p>
          <p className="mt-2 leading-6">
            Dieser Name ist auf einem anderen Gerät eingeloggt. Sitzung übernehmen? Das andere
            Gerät wird abgemeldet.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <GridButton type="button" disabled={isPending} onClick={() => completeJoin(true)}>
              {isPending ? "Übernehme…" : "Ja, Sitzung übernehmen"}
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
            <GridLabel hint="Wird im Team angezeigt — eindeutig wählen">
              Dein Spielername
            </GridLabel>
            <GridInput
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="z. B. Pixel-Ranger"
              required
              minLength={2}
              maxLength={32}
            />
          </div>

          {error ? <GridError message={error} /> : null}

          <GridButton
            type="button"
            disabled={isPending || displayName.trim().length < 2}
            icon={<IconArrowRight size={16} />}
            onClick={() => completeJoin(false)}
          >
            {isPending
              ? "Beitritt läuft…"
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
