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

type MemberJoinFormProps = {
  inviteCode: string;
  joinCode: string;
  teamName: string;
};

export function MemberJoinForm({
  inviteCode,
  joinCode,
  teamName,
}: MemberJoinFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      router.push(`/join/${inviteCode}/lobby/${joinCode}`);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-3 text-sm text-[var(--grid-muted)]">
        Du trittst Team <span className="text-white">{teamName}</span> bei.
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
        {isPending ? "Beitritt läuft…" : "Lobby beitreten"}
      </GridButton>
    </form>
  );
}
