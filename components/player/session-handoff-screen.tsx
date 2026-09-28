"use client";

import { useState, useTransition } from "react";
import { recoverSessionByPlayerId } from "@/app/actions/lobby";
import { GridButton } from "@/components/grid/grid-shell";
import { IconPlay } from "@/components/cms/studio-icons";
import { savePlayerSession } from "@/lib/grid/player-session";

import { playUi } from "@/lib/grid/play-ui";

type SessionHandoffScreenProps = {
  inviteCode: string;
  joinCode: string;
  playerId: string;
  displayName: string;
  language?: string | null;
};

export function SessionHandoffScreen({
  inviteCode,
  joinCode,
  playerId,
  displayName,
  language,
}: SessionHandoffScreenProps) {
  const t = playUi(language).lobby;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReclaim() {
    setError(null);
    startTransition(async () => {
      const recovered = await recoverSessionByPlayerId({
        inviteCode,
        joinCode,
        playerId,
      });

      if (!recovered.success) {
        setError(recovered.error);
        return;
      }

      savePlayerSession(recovered.data.session);
      window.location.reload();
    });
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {t.handoffEyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">
        {t.handoffTitle}
      </h2>
      <p className="mt-4 max-w-md text-sm leading-7 text-slate-500">
        {t.handoffBody(displayName)}
      </p>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <GridButton
        type="button"
        className="mt-6 max-w-xs"
        disabled={isPending}
        icon={<IconPlay size={16} />}
        onClick={handleReclaim}
      >
        {isPending ? t.handoffPending : t.handoffCta}
      </GridButton>
    </div>
  );
}
