"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { joinTeamAsPlayer, listActiveTeamJoinRoster } from "@/app/actions/lobby";
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
 * - Gerät wechseln → pick your exact name from the roster (or type it)
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
  const [roster, setRoster] = useState<string[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);
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

  useEffect(() => {
    if (checkingSession) return;

    let cancelled = false;
    listActiveTeamJoinRoster({ inviteCode, joinCode }).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setRoster(result.data.members.map((m) => m.displayName));
      }
      setRosterLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [checkingSession, inviteCode, joinCode]);

  function completeJoin(
    takeover: boolean,
    nameOverride?: string,
    modeOverride?: JoinMode,
  ) {
    const name = (nameOverride ?? displayName).trim();
    const effectiveMode = modeOverride ?? mode;
    setError(null);

    startTransition(async () => {
      const result = await joinTeamAsPlayer({
        inviteCode,
        joinCode,
        displayName: name,
        mode: takeover ? "new" : effectiveMode,
        takeover,
      });

      if (!result.success) {
        if (result.code === SESSION_ACTIVE && effectiveMode === "new") {
          setPendingTakeover(name);
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

  function pickRosterName(name: string) {
    setDisplayName(name);
    setMode("switch");
    setPendingTakeover(null);
    setError(null);
    completeJoin(false, name, "switch");
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
          : "Tippe auf deinen Namen unten — Schreibweise muss nicht erraten werden."}
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
          {mode === "switch" ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Wer bist du?</p>
              {!rosterLoaded ? (
                <p className="text-sm text-slate-500">Namen werden geladen…</p>
              ) : roster.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Noch niemand im Team — zuerst „Neu mitspielen“ wählen.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {roster.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => pickRosterName(name)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left font-semibold text-slate-900 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/50 disabled:opacity-50"
                      >
                        <span className="truncate">{name}</span>
                        <span className="shrink-0 text-xs font-bold text-teal-700">
                          Das bin ich
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="pt-1 text-center text-[11px] leading-relaxed text-slate-400">
                Tipp: In der Lobby kannst du deinen persönlichen Weiterspiel-Link speichern —
                dann brauchst du den Namen beim nächsten Mal nicht.
              </p>
            </div>
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

              {error?.includes("voll") ? (
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
                  : isMidGame
                    ? "Team beitreten"
                    : "Mitspielen"}
              </GridButton>
            </>
          )}

          {mode === "switch" && error ? <GridError message={error} /> : null}
        </>
      )}
    </div>
  );
}

export const MemberJoinForm = TeamEntryGate;
