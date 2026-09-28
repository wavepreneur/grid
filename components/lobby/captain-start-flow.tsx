"use client";

import { useState } from "react";
import { CaptainSetupForm } from "@/components/lobby/captain-setup-form";
import { GameStartIntro } from "@/components/lobby/game-start-intro";
import { GridShell } from "@/components/grid/grid-shell";
import { playUi } from "@/lib/grid/play-ui";
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
  const t = playUi(language ?? eventContent?.language);

  if (!introDone) {
    return (
      <GameStartIntro
        gameTitle={gameTitle}
        logoUrl={eventContent?.logoUrl}
        shortText={eventContent?.briefingText}
        briefingIframeUrl={eventContent?.briefingIframeUrl}
        startCoords={firstPuzzleLocation(eventContent?.levels)}
        language={language ?? eventContent?.language}
        onContinue={() => setIntroDone(true)}
      />
    );
  }

  return (
    <GridShell
      variant="welcome"
      eyebrow={studioTest ? t.startFlow.testEyebrow : t.startFlow.eyebrow}
      title={gameTitle}
      description={t.startFlow.description}
      logoUrl={eventContent?.logoUrl}
    >
      <CaptainSetupForm
        inviteCode={inviteCode}
        joinCode={joinCode}
        studioTest={studioTest}
        maxPlayersPerTeam={maxPlayersPerTeam}
        eventContent={eventContent}
        language={language ?? eventContent?.language}
      />
      {!studioTest ? (
        <p className="mt-5 text-center text-xs text-slate-400">
          <button
            type="button"
            onClick={() => setIntroDone(false)}
            className="text-teal-700 hover:underline"
          >
            {t.startFlow.back}
          </button>
          {" · "}
          <Link href={eventPath(inviteCode)} className="text-teal-700 hover:underline">
            {t.startFlow.event}
          </Link>
        </p>
      ) : (
        <p className="mt-5 text-center text-xs text-slate-400">
          <button
            type="button"
            onClick={() => setIntroDone(false)}
            className="text-teal-700 hover:underline"
          >
            {t.startFlow.backToIntro}
          </button>
        </p>
      )}
    </GridShell>
  );
}
