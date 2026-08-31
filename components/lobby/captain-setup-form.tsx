"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Flag, User } from "lucide-react";
import {
  createTeamAsCaptain,
  setupPrebookedTeamAsCaptain,
} from "@/app/actions/lobby";
import { GridError } from "@/components/grid/grid-shell";
import {
  IdentityField,
  LobbyPrimaryButton,
} from "@/components/lobby/lobby-identity";
import { eventLobbyPath } from "@/lib/grid/event-routes";
import { savePlayerSession } from "@/lib/grid/player-session";

type CaptainSetupFormProps = {
  inviteCode: string;
  joinCode?: string;
  /** Studio test: only team + player name; department/region filled server-side. */
  studioTest?: boolean;
  /** Event cap — form no longer asks for size. */
  maxPlayersPerTeam?: number;
};

export function CaptainSetupForm({
  inviteCode,
  joinCode,
  studioTest = false,
  maxPlayersPerTeam = 4,
}: CaptainSetupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isPrebooked = Boolean(joinCode);
  const teamCap = Math.min(8, Math.max(1, maxPlayersPerTeam));

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const payload = {
        inviteCode,
        teamName: String(formData.get("teamName") ?? ""),
        maxSize: teamCap,
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
    <form action={handleSubmit} className="flex flex-col gap-4">
      <p className="text-center text-sm font-medium leading-relaxed text-slate-500">
        Teamname fürs Ranking, dein Name fürs Team — dann ab in den Wartebereich.
      </p>

      <IdentityField
        name="teamName"
        label="Teamname"
        hint="So erscheint ihr im Ranking"
        previewHint="Ranking-Name"
        step="1 / 2"
        tone="team"
        icon={<Flag size={20} strokeWidth={2.25} />}
        placeholder="z. B. Berlin Explorers"
        required
        minLength={2}
        maxLength={48}
        autoComplete="organization"
        autoCapitalize="words"
        enterKeyHint="next"
      />

      <IdentityField
        name="displayName"
        label="Dein Name"
        hint="Dein Name im Team"
        previewHint="Dein Anzeigename"
        step="2 / 2"
        tone="player"
        icon={<User size={20} strokeWidth={2.25} />}
        placeholder="z. B. Dervis"
        required
        minLength={2}
        maxLength={32}
        autoComplete="nickname"
        autoCapitalize="words"
        enterKeyHint="done"
      />

      <input type="hidden" name="department" value="Other" />
      <input type="hidden" name="region" value="DACH" />

      {error ? <GridError message={error} /> : null}

      <LobbyPrimaryButton pending={isPending}>
        {isPending ? "Gleich geht’s los…" : "Weiter zum Wartebereich"}
        {isPending ? null : <ArrowRight size={20} strokeWidth={2.5} />}
      </LobbyPrimaryButton>

      {studioTest || isPrebooked ? (
        <p className="text-center text-xs font-medium text-slate-400">
          {studioTest ? "Studio-Test" : `Team-Code ${joinCode}`}
        </p>
      ) : null}
    </form>
  );
}
