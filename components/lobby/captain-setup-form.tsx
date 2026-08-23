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
  /** Studio test: only team + player name; department/region filled server-side. */
  studioTest?: boolean;
};

export function CaptainSetupForm({
  inviteCode,
  joinCode,
  studioTest = false,
}: CaptainSetupFormProps) {
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
        maxSize: Number(formData.get("maxSize") ?? (studioTest ? 3 : 4)),
        department: String(formData.get("department") ?? (studioTest ? "Other" : "")),
        region: String(formData.get("region") ?? (studioTest ? "DACH" : "")),
        displayName: String(formData.get("displayName") ?? ""),
      };

      const result =
        isPrebooked && joinCode
          ? await setupPrebookedTeamAsCaptain({ ...payload, joinCode })
          : await createTeamAsCaptain(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      savePlayerSession(result.data);
      router.replace(eventLobbyPath(inviteCode, result.data.joinCode));
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      {studioTest ? (
        <GridHint tone="info">
          Als Team Lead legst du zuerst den <strong>Teamnamen</strong> fest (Highscore), danach
          deinen Spielernamen.
        </GridHint>
      ) : isPrebooked ? (
        <GridHint tone="info">
          Vorgebuchtes Team <strong>{joinCode}</strong> — wähle Teamname und deinen Spielernamen.
        </GridHint>
      ) : null}

      <div>
        <GridLabel hint="Erscheint später in der Highscore / im Ranking">Teamname</GridLabel>
        <GridInput
          name="teamName"
          placeholder="z. B. Berlin Explorers"
          required
          minLength={2}
          maxLength={48}
          autoComplete="organization"
        />
      </div>

      <div>
        <GridLabel hint="Zur eindeutigen Zuordnung im Team während des Spiels">
          Dein Spielername
        </GridLabel>
        <GridInput
          name="displayName"
          placeholder="z. B. Dervis"
          required
          minLength={2}
          maxLength={32}
          autoComplete="nickname"
        />
      </div>

      {studioTest ? (
        <>
          <input type="hidden" name="maxSize" value="3" />
          <input type="hidden" name="department" value="Other" />
          <input type="hidden" name="region" value="DACH" />
        </>
      ) : (
        <>
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
        </>
      )}

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
