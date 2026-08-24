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
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";
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
        maxSize: Number(formData.get("maxSize") ?? 4),
        department: String(formData.get("department") ?? "Other"),
        region: String(formData.get("region") ?? "DACH"),
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
      <p className="text-center text-sm leading-relaxed text-slate-500">
        Zwei kurze Angaben — dann seid ihr im Wartebereich und könnt Mitspieler holen.
      </p>

      <div>
        <GridLabel hint="So erscheint ihr im Ranking">Teamname</GridLabel>
        <GridInput
          name="teamName"
          placeholder="z. B. Berlin Explorers"
          required
          minLength={2}
          maxLength={48}
          autoComplete="organization"
          className="text-base"
        />
      </div>

      <div>
        <GridLabel hint="Dein Name im Team">Dein Name</GridLabel>
        <GridInput
          name="displayName"
          placeholder="z. B. Dervis"
          required
          minLength={2}
          maxLength={32}
          autoComplete="nickname"
          className="text-base"
        />
      </div>

      <input type="hidden" name="maxSize" value="4" />
      <input type="hidden" name="department" value="Other" />
      <input type="hidden" name="region" value="DACH" />

      {error ? <GridError message={error} /> : null}

      <GridButton type="submit" disabled={isPending} className="mt-1 py-4 text-base">
        {isPending ? "Gleich geht’s los…" : "Weiter zum Wartebereich"}
      </GridButton>

      {studioTest || isPrebooked ? (
        <p className="text-center text-xs text-slate-400">
          {studioTest ? "Studio-Test" : `Team-Code ${joinCode}`}
        </p>
      ) : null}
    </form>
  );
}
