"use client";

import { useState, useTransition } from "react";
import { getPlayerResumeToken, recoverSessionByPlayerId } from "@/app/actions/lobby";
import { GridButton } from "@/components/grid/grid-shell";
import { syncResumeTokenInUrl } from "@/lib/grid/play-url";
import { savePlayerSession } from "@/lib/grid/player-session";

type SessionHandoffScreenProps = {
  inviteCode: string;
  joinCode: string;
  playerId: string;
  displayName: string;
};

export function SessionHandoffScreen({
  inviteCode,
  joinCode,
  playerId,
  displayName,
}: SessionHandoffScreenProps) {
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

      const tokenResult = await getPlayerResumeToken({
        inviteCode,
        joinCode,
        sessionId: recovered.data.session.sessionId,
      });

      if (tokenResult.success) {
        syncResumeTokenInUrl(tokenResult.data.resumeToken);
      }

      window.location.reload();
    });
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-[var(--grid-border)] bg-black/40 px-6 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--grid-muted)]">Sitzung pausiert</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Spiel läuft auf einem anderen Gerät</h2>
      <p className="mt-4 max-w-md text-sm leading-7 text-[var(--grid-muted)]">
        {displayName}, deine Sitzung wurde auf einem anderen Gerät geöffnet. Du kannst das Spiel
        jederzeit wieder auf dieses Gerät holen.
      </p>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      <GridButton type="button" className="mt-6" disabled={isPending} onClick={handleReclaim}>
        {isPending ? "Wird übernommen…" : "Spiel hierher holen"}
      </GridButton>
    </div>
  );
}
