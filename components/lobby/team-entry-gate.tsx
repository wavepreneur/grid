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

type JoinMode = "new" | "switch";

type TeamEntryGateProps = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
  teamStatus: GridTeamStatus;
  defaultDisplayName?: string;
};

/**
 * Two clear paths:
 * - Neu mitspielen → claim a free seat
 * - Gerät wechseln → same person, rotate session (no new seat)
 */
export function TeamEntryGate({
  inviteCode,
  joinCode,
  teamName,
  teamStatus,
  defaultDisplayName = "",
}: TeamEntryGateProps) {
  const router = useRouter();
  const [mode, setMode] = useState<JoinMode>("new");
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
        mode: takeover ? "new" : mode,
        takeover,
      });

      if (!result.success) {
        if (result.code === SESSION_ACTIVE && mode === "new") {
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
        Team <strong className="text-slate-800">{teamName}</strong>
        {isMidGame ? " — das Spiel läuft bereits." : null}
      </p>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("new");
            setPendingTakeover(null);
            setError(null);
          }}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            mode === "new"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          Neu mitspielen
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("switch");
            setPendingTakeover(null);
            setError(null);
          }}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            mode === "switch"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          Gerät wechseln
        </button>
      </div>

      <p className="text-center text-xs leading-relaxed text-slate-500">
        {mode === "new"
          ? "Neuen Platz im Team belegen — nur wenn noch einer frei ist."
          : "Du warst schon dabei (Akku leer, anderes Handy). Gleicher Name — kein neuer Platz."}
      </p>

      {pendingTakeover ? (
        <GridHint tone="warn">
          <p className="font-medium">„{pendingTakeover}“ ist schon angemeldet</p>
          <p className="mt-2 leading-6">
            Bist du das? Dann spiel hier weiter — das andere Gerät wird abgemeldet.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <GridButton type="button" disabled={isPending} onClick={() => completeJoin(true)}>
              {isPending ? "Übernehme…" : "Ja, hier weiterspielen"}
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
            <GridLabel>
              {mode === "switch" ? "Dein Name im Team" : "Dein Name"}
            </GridLabel>
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

          {error?.includes("voll") && mode === "new" ? (
            <button
              type="button"
              className="text-center text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
              onClick={() => {
                setMode("switch");
                setError(null);
              }}
            >
              Ich bin schon im Team — Gerät wechseln
            </button>
          ) : null}

          <GridButton
            type="button"
            className="py-4 text-base"
            disabled={isPending || displayName.trim().length < 2}
            onClick={() => completeJoin(false)}
          >
            {isPending
              ? "Einen Moment…"
              : mode === "switch"
                ? "Auf diesem Gerät weiterspielen"
                : isMidGame
                  ? "Team beitreten"
                  : "Mitspielen"}
          </GridButton>
        </>
      )}
    </div>
  );
}

export const MemberJoinForm = TeamEntryGate;
