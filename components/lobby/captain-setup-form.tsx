"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createTeamAsCaptain,
  setupPrebookedTeamAsCaptain,
} from "@/app/actions/lobby";
import {
  GridButton,
  GridError,
  GridHint,
  GridInput,
  GridLabel,
  GridSelect,
} from "@/components/grid/grid-shell";
import {
  DEPARTMENT_OPTIONS,
  REGION_OPTIONS,
} from "@/lib/grid/constants";
import { eventLobbyPath } from "@/lib/grid/event-routes";
import { savePlayerSession } from "@/lib/grid/player-session";

type CaptainSetupFormProps = {
  inviteCode: string;
  joinCode?: string;
};

export function CaptainSetupForm({ inviteCode, joinCode }: CaptainSetupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isPrebooked = Boolean(joinCode);

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const payload = {
        inviteCode,
        teamName: String(formData.get("teamName") ?? ""),
        maxSize: Number(formData.get("maxSize") ?? 4),
        department: String(formData.get("department") ?? ""),
        region: String(formData.get("region") ?? ""),
        displayName: String(formData.get("displayName") ?? ""),
      };

      const result = isPrebooked && joinCode
        ? await setupPrebookedTeamAsCaptain({ ...payload, joinCode })
        : await createTeamAsCaptain(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      savePlayerSession(result.data);
      router.push(eventLobbyPath(inviteCode, result.data.joinCode));
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      {isPrebooked ? (
        <GridHint tone="info">
          Vorgebuchtes Team <strong>{joinCode}</strong> — wähle Name und Teamgröße.
        </GridHint>
      ) : null}

      <div>
        <GridLabel hint="Wird im Team angezeigt">Dein Spielername</GridLabel>
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
        {isPending
          ? "Lobby wird erstellt…"
          : isPrebooked
            ? "Team konfigurieren & Lobby öffnen"
            : "Team erstellen & Lobby öffnen"}
      </GridButton>
    </form>
  );
}
