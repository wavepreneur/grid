"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GridButton, GridHint, GridInput } from "@/components/grid/grid-shell";
import { IconArrowRight, IconPlay, IconUsers } from "@/components/cms/studio-icons";
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
    <GridHint tone="success">
      <p>
        Willkommen zurück, <strong>{resumeLabel}</strong>!
      </p>
      <GridButton
        type="button"
        className="mt-3"
        icon={<IconPlay size={16} />}
        onClick={() => router.push(resumePath)}
      >
        Weiterspielen
      </GridButton>
    </GridHint>
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
        <p className="text-sm font-medium text-slate-700">Du organisierst das Team?</p>
        <GridButton
          type="button"
          icon={<IconPlay size={16} />}
          onClick={() => router.push(`${eventPath(inviteCode)}/captain`)}
        >
          Erstes Team starten
        </GridButton>
        <p className="text-xs leading-6 text-slate-500">
          Als Team-Leiter erstellst du das Team und lädst Mitspieler per Link oder QR-Code ein.
        </p>
      </div>

      <div className="border-t border-slate-100 pt-8">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <IconUsers size={16} className="text-teal-600" />
          Team beitreten
        </p>
        <TeamCodeInline inviteCode={inviteCode} />
      </div>

      <p className="text-center text-xs text-slate-500">
        Event-Code:{" "}
        <span className="font-mono font-medium text-teal-600">{inviteCode}</span>
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
      <GridInput
        value={joinCode}
        onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
        placeholder="Team-Code eingeben (z. B. WC2RJ9)"
        maxLength={8}
      />
      <GridButton
        type="submit"
        disabled={joinCode.trim().length < 4}
        icon={<IconArrowRight size={16} />}
      >
        Beitreten
      </GridButton>
    </form>
  );
}
