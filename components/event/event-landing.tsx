"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GridButton } from "@/components/grid/grid-shell";
import { eventPath } from "@/lib/grid/event-routes";
import { loadPlayerSession } from "@/lib/grid/player-session";
import { resolveTeamSession } from "@/lib/grid/session-recovery";
import type { GridEvent } from "@/lib/grid/types";

type EventResumeCardProps = {
  inviteCode: string;
};

export function EventResumeCard({ inviteCode }: EventResumeCardProps) {
  const router = useRouter();
  const [resumeLabel, setResumeLabel] = useState<string | null>(null);
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = loadPlayerSession();
    if (!session || session.inviteCode !== inviteCode.toUpperCase()) {
      setLoading(false);
      return;
    }

    resolveTeamSession(session.inviteCode, session.joinCode).then((resolved) => {
      if (resolved) {
        setResumeLabel(resolved.session.displayName);
        setResumePath(resolved.path);
      }
      setLoading(false);
    });
  }, [inviteCode]);

  if (loading || !resumeLabel || !resumePath) return null;

  return (
    <div className="rounded-xl border border-[var(--grid-accent)]/30 bg-[var(--grid-accent)]/10 px-4 py-4">
      <p className="text-sm text-[var(--grid-muted)]">
        Willkommen zurück, <span className="text-white">{resumeLabel}</span>
      </p>
      <GridButton type="button" className="mt-3" onClick={() => router.push(resumePath)}>
        Weiterspielen
      </GridButton>
    </div>
  );
}

type EventLandingProps = {
  event: GridEvent;
};

export function EventLanding({ event }: EventLandingProps) {
  const router = useRouter();
  const inviteCode = event.invite_code;

  return (
    <div className="flex flex-col gap-8">
      <EventResumeCard inviteCode={inviteCode} />

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
          Neu im Team?
        </p>
        <GridButton
          type="button"
          onClick={() => router.push(`${eventPath(inviteCode)}/captain`)}
        >
          Erstes Team starten (Captain)
        </GridButton>
        <p className="text-xs leading-6 text-[var(--grid-muted)]">
          Du bist der Organisator — erstellst das Team und lädst per QR ein.
        </p>
      </div>

      <div className="border-t border-[var(--grid-border)] pt-8">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
          Team beitreten
        </p>
        <TeamCodeInline inviteCode={inviteCode} />
      </div>

      <p className="text-center text-xs text-[var(--grid-muted)]">
        Event-Code:{" "}
        <span className="font-mono text-[var(--grid-accent)]">{inviteCode}</span>
      </p>
    </div>
  );
}

function TeamCodeInline({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = joinCode.trim().toUpperCase();
    if (normalized.length < 4) return;
    router.push(`/e/${inviteCode}/team/${normalized}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        value={joinCode}
        onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
        placeholder="Team-Code (z. B. WC2RJ9)"
        maxLength={8}
        className="grid-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
      />
      <GridButton type="submit" disabled={joinCode.trim().length < 4}>
        Beitreten
      </GridButton>
    </form>
  );
}
