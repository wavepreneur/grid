"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight, User } from "lucide-react";
import { joinTeamAsPlayer, listActiveTeamJoinRoster } from "@/app/actions/lobby";
import {
  GridError,
  GridHint,
} from "@/components/grid/grid-shell";
import {
  IdentityField,
  LobbyPrimaryButton,
} from "@/components/lobby/lobby-identity";
import { normalizeDisplayNameKey } from "@/lib/grid/codes";
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
  captainDisplayName?: string | null;
  defaultDisplayName?: string;
};

export function TeamEntryGate({
  inviteCode,
  joinCode,
  teamName,
  teamStatus,
  captainDisplayName = null,
  defaultDisplayName = "",
}: TeamEntryGateProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [roster, setRoster] = useState<string[]>([]);
  const [seatsLeft, setSeatsLeft] = useState(0);
  const [maxSize, setMaxSize] = useState(0);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
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
        setSeatsLeft(result.data.seatsLeft);
        setMaxSize(result.data.maxSize);
      }
      setRosterLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [checkingSession, inviteCode, joinCode]);

  function completeJoin(name: string, asExisting: boolean) {
    const trimmed = name.trim();
    setError(null);

    startTransition(async () => {
      const result = await joinTeamAsPlayer({
        inviteCode,
        joinCode,
        displayName: trimmed,
        mode: asExisting ? "switch" : "new",
        takeover: asExisting,
      });

      if (!result.success) {
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
    completeJoin(name, true);
  }

  function submitNewName() {
    const trimmed = displayName.trim();
    const existing = roster.find(
      (entry) => normalizeDisplayNameKey(entry) === normalizeDisplayNameKey(trimmed),
    );
    if (existing) {
      completeJoin(existing, true);
      return;
    }
    completeJoin(trimmed, false);
  }

  if (checkingSession) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">Einen Moment…</p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-teal-50/80 px-4 py-4 text-center">
        {captainDisplayName ? (
          <p className="text-sm font-semibold text-teal-900">
            {captainDisplayName} lädt dich zum Spiel ein
          </p>
        ) : (
          <p className="text-sm font-semibold text-teal-900">Dein Team</p>
        )}
        <p className="mt-1 text-base font-bold text-slate-900">{teamName}</p>
        {rosterLoaded && maxSize > 0 ? (
          <p className="mt-1 text-sm font-semibold text-teal-800">
            {roster.length} von {maxSize} Plätzen
          </p>
        ) : null}
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {roster.length > 0
            ? "Wähl deinen Namen — oder trag einen neuen ein, wenn noch Platz ist."
            : isMidGame
              ? "Das Spiel läuft. Trag deinen Namen ein."
              : "Trag deinen Namen ein. Danach landest du bei den anderen."}
        </p>
      </div>

      {rosterLoaded && roster.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Schon im Team</p>
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
                  <span className="shrink-0 text-xs font-bold text-teal-700">Das bin ich</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs leading-5 text-slate-500">
            Warst du schon drin, nimm deinen Namen. Das andere Gerät wird abgemeldet.
          </p>
        </div>
      ) : null}

      {error ? <GridError message={error} /> : null}

      {rosterLoaded && seatsLeft <= 0 && roster.length > 0 ? (
        <GridHint tone="warn">
          Das Team ist voll. Nur bestehende Namen können sich wieder verbinden.
        </GridHint>
      ) : (
        <>
          <IdentityField
            label={roster.length > 0 ? "Neuer Name" : "Dein Name"}
            hint="So siehst du im Team aus"
            previewHint="Dein Anzeigename"
            tone="player"
            icon={<User size={20} strokeWidth={2.25} />}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="z. B. Alex"
            required
            minLength={2}
            maxLength={32}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="done"
          />

          <LobbyPrimaryButton
            type="button"
            pending={isPending}
            disabled={displayName.trim().length < 2}
            onClick={submitNewName}
          >
            {isPending ? "Einen Moment…" : roster.length > 0 ? "Neu dazukommen" : "Loslegen"}
            {isPending ? null : <ArrowRight size={20} strokeWidth={2.5} />}
          </LobbyPrimaryButton>
        </>
      )}
    </div>
  );
}

export const MemberJoinForm = TeamEntryGate;
