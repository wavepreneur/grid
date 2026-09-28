"use client";

import { useEffect, useState, useTransition } from "react";
import { cacheEventContent } from "@/lib/grid/offline-content";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
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
import { MAX_PLAYERS_PER_TEAM } from "@/lib/grid/team-seats";
import { eventLobbyPath } from "@/lib/grid/event-routes";
import { playUi } from "@/lib/grid/play-ui";
import { savePlayerSession } from "@/lib/grid/player-session";

type CaptainSetupFormProps = {
  inviteCode: string;
  joinCode?: string;
  /** Studio test: only team + player name; department/region filled server-side. */
  studioTest?: boolean;
  /** Event cap — form no longer asks for size. */
  maxPlayersPerTeam?: number;
  eventContent?: ResolvedEventContent | null;
  language?: string | null;
};

export function CaptainSetupForm({
  inviteCode,
  joinCode,
  studioTest = false,
  maxPlayersPerTeam = 4,
  eventContent = null,
  language,
}: CaptainSetupFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = playUi(language ?? eventContent?.language);

  useEffect(() => {
    if (eventContent) cacheEventContent(inviteCode, eventContent);
  }, [eventContent, inviteCode]);
  const isPrebooked = Boolean(joinCode);
  const teamCap = Math.min(MAX_PLAYERS_PER_TEAM, Math.max(1, maxPlayersPerTeam));

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
      window.location.assign(eventLobbyPath(inviteCode, result.data.joinCode));
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <p className="text-center text-sm font-medium leading-relaxed text-slate-500">
        {t.setup.intro}
      </p>

      <IdentityField
        name="teamName"
        label={t.setup.teamLabel}
        hint={t.setup.teamHint}
        previewHint={t.setup.teamPreview}
        step="1 / 2"
        tone="team"
        icon={<Flag size={20} strokeWidth={2.25} />}
        placeholder={t.setup.teamPlaceholder}
        required
        minLength={2}
        maxLength={48}
        autoComplete="organization"
        autoCapitalize="words"
        enterKeyHint="next"
      />

      <IdentityField
        name="displayName"
        label={t.setup.nameLabel}
        hint={t.setup.nameHint}
        previewHint={t.setup.namePreview}
        step="2 / 2"
        tone="player"
        icon={<User size={20} strokeWidth={2.25} />}
        placeholder={t.setup.namePlaceholder}
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
        {isPending ? t.setup.pending : t.setup.submit}
        {isPending ? null : <ArrowRight size={20} strokeWidth={2.5} />}
      </LobbyPrimaryButton>

      {studioTest || isPrebooked ? (
        <p className="text-center text-xs font-medium text-slate-400">
          {studioTest ? t.setup.studioTest : t.setup.teamCode(joinCode ?? "")}
        </p>
      ) : null}
    </form>
  );
}
