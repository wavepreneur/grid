"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinTeamAsPlayer } from "@/app/actions/lobby";
import {
  GridButton,
  GridError,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";
import { savePlayerSession } from "@/lib/grid/player-session";
import type { GridTeamStatus } from "@/lib/grid/types";

type MemberJoinFormProps = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
  teamStatus: GridTeamStatus;
};

function joinDestination(
  inviteCode: string,
  joinCode: string,
  teamStatus: GridTeamStatus,
): string {
  if (teamStatus === "playing" || teamStatus === "finished") {
    return `/play/${inviteCode}/${joinCode}`;
  }
  return `/join/${inviteCode}/lobby/${joinCode}`;
}

export function MemberJoinForm({
  inviteCode,
  joinCode,
  teamName,
  teamStatus,
}: MemberJoinFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isMidGame = teamStatus === "playing" || teamStatus === "finished";

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await joinTeamAsPlayer({
        inviteCode,
        joinCode,
        displayName: String(formData.get("displayName") ?? ""),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      savePlayerSession(result.data);
      router.push(
        joinDestination(
          inviteCode,
          joinCode,
          result.data.teamStatus ?? teamStatus,
        ),
      );
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-3 text-sm text-[var(--grid-muted)]">
        Du trittst Team <span className="text-white">{teamName}</span> bei.
        {isMidGame ? (
          <p className="mt-2 text-[var(--grid-accent)]">
            Das Spiel läuft bereits — du wirst direkt zum aktuellen Stand deines Teams
            weitergeleitet.
          </p>
        ) : null}
      </div>

      <div>
        <GridLabel>Dein Spielername (Pseudonym)</GridLabel>
        <GridInput
          name="displayName"
          placeholder="z. B. Pixel-Ranger"
          required
          minLength={2}
          maxLength={32}
        />
      </div>

      {error ? <GridError message={error} /> : null}

      <GridButton type="submit" disabled={isPending}>
        {isPending
          ? "Beitritt läuft…"
          : isMidGame
            ? "Spiel beitreten"
            : "Lobby beitreten"}
      </GridButton>
    </form>
  );
}
