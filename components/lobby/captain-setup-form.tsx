"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTeamAsCaptain } from "@/app/actions/lobby";
import {
  GridButton,
  GridError,
  GridInput,
  GridLabel,
  GridSelect,
} from "@/components/grid/grid-shell";
import {
  DEPARTMENT_OPTIONS,
  REGION_OPTIONS,
} from "@/lib/grid/constants";
import { savePlayerSession } from "@/lib/grid/player-session";

type CaptainSetupFormProps = {
  inviteCode: string;
};

export function CaptainSetupForm({ inviteCode }: CaptainSetupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await createTeamAsCaptain({
        inviteCode,
        teamName: String(formData.get("teamName") ?? ""),
        maxSize: Number(formData.get("maxSize") ?? 4),
        department: String(formData.get("department") ?? ""),
        region: String(formData.get("region") ?? ""),
        displayName: String(formData.get("displayName") ?? ""),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      savePlayerSession(result.data);
      router.push(`/join/${inviteCode}/lobby/${result.data.joinCode}`);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <div>
        <GridLabel>Dein Spielername (Pseudonym)</GridLabel>
        <GridInput
          name="displayName"
          placeholder="z. B. Nova-7"
          required
          minLength={2}
          maxLength={32}
        />
      </div>

      <div>
        <GridLabel>Teamname</GridLabel>
        <GridInput
          name="teamName"
          placeholder="z. B. Quantum Explorers"
          required
          minLength={2}
          maxLength={48}
        />
      </div>

      <div>
        <GridLabel>Teamgröße (1–8)</GridLabel>
        <GridSelect name="maxSize" defaultValue="4">
          {Array.from({ length: 8 }, (_, index) => index + 1).map((size) => (
            <option key={size} value={size}>
              {size} {size === 1 ? "Spieler" : "Spieler"}
            </option>
          ))}
        </GridSelect>
      </div>

      <div>
        <GridLabel>Abteilung</GridLabel>
        <GridSelect name="department" required defaultValue="">
          <option value="" disabled>
            Abteilung wählen
          </option>
          {DEPARTMENT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </GridSelect>
      </div>

      <div>
        <GridLabel>Region / Land</GridLabel>
        <GridSelect name="region" required defaultValue="">
          <option value="" disabled>
            Region wählen
          </option>
          {REGION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </GridSelect>
      </div>

      {error ? <GridError message={error} /> : null}

      <GridButton type="submit" disabled={isPending}>
        {isPending ? "Lobby wird erstellt…" : "Team erstellen & Lobby öffnen"}
      </GridButton>
    </form>
  );
}
