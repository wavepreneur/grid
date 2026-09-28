"use client";

import { useState } from "react";
import { CaptainSetupForm } from "@/components/lobby/captain-setup-form";
import { GameStartIntro } from "@/components/lobby/game-start-intro";
import { GridShell } from "@/components/grid/grid-shell";
import { parseStudioLanguage } from "@/lib/cms/languages";
import { firstPuzzleLocation } from "@/lib/grid/start-location";
import type { ResolvedEventContent } from "@/lib/grid/level-types";
import Link from "next/link";
import { eventPath } from "@/lib/grid/event-routes";

type Props = {
  inviteCode: string;
  joinCode?: string;
  studioTest?: boolean;
  maxPlayersPerTeam: number;
  eventContent: ResolvedEventContent | null;
  gameTitle: string;
  language?: string | null;
};

export function CaptainStartFlow({
  inviteCode,
  joinCode,
  studioTest = false,
  maxPlayersPerTeam,
  eventContent,
  gameTitle,
  language,
}: Props) {
  const [introDone, setIntroDone] = useState(false);
  const locale = parseStudioLanguage(language) === "en" ? "en" : "de";

  if (!introDone) {
    return (
      <GameStartIntro
        gameTitle={gameTitle}
        logoUrl={eventContent?.logoUrl}
        shortText={eventContent?.briefingText}
        briefingIframeUrl={eventContent?.briefingIframeUrl}
        startCoords={firstPuzzleLocation(eventContent?.levels)}
        language={locale}
        onContinue={() => setIntroDone(true)}
      />
    );
  }

  return (
    <GridShell
      variant="welcome"
      eyebrow={studioTest ? "Testspiel" : "Willkommen"}
      title={gameTitle}
      description={
        locale === "en"
          ? "Set a team name and your name — then you enter the waiting area."
          : "Legt euren Teamnamen und deinen Namen fest — dann geht’s in den Wartebereich."
      }
      logoUrl={eventContent?.logoUrl}
    >
      <CaptainSetupForm
        inviteCode={inviteCode}
        joinCode={joinCode}
        studioTest={studioTest}
        maxPlayersPerTeam={maxPlayersPerTeam}
        eventContent={eventContent}
      />
      {!studioTest ? (
        <p className="mt-5 text-center text-xs text-slate-400">
          <button
            type="button"
            onClick={() => setIntroDone(false)}
            className="text-teal-700 hover:underline"
          >
            {locale === "en" ? "← Back" : "← Zurück"}
          </button>
          {" · "}
          <Link href={eventPath(inviteCode)} className="text-teal-700 hover:underline">
            {locale === "en" ? "Event" : "Event"}
          </Link>
        </p>
      ) : (
        <p className="mt-5 text-center text-xs text-slate-400">
          <button
            type="button"
            onClick={() => setIntroDone(false)}
            className="text-teal-700 hover:underline"
          >
            {locale === "en" ? "← Back to intro" : "← Zurück zum Start"}
          </button>
        </p>
      )}
    </GridShell>
  );
}
