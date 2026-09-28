"use client";

import { useState } from "react";
import { BookOpen, MapPin, Navigation, Play } from "lucide-react";
import { PlayDocSheet } from "@/components/game/play-doc-sheet";
import { LobbyPrimaryButton } from "@/components/lobby/lobby-identity";
import { walkingDirectionsUrl, type StartCoords } from "@/lib/grid/start-location";

type Props = {
  gameTitle: string;
  logoUrl?: string | null;
  shortText?: string | null;
  briefingIframeUrl?: string | null;
  startCoords?: StartCoords | null;
  language?: "de" | "en";
  onContinue: () => void;
};

function briefingUrlWithLang(url: string | null | undefined, language: "de" | "en"): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!parsed.searchParams.has("lang")) parsed.searchParams.set("lang", language);
    return parsed.toString();
  } catch {
    return raw;
  }
}

const COPY = {
  de: {
    rules: "Spielregeln",
    start: "Starte das Spiel",
    modalTitle: "Seid ihr am Start?",
    modalBody:
      "Starte das Spiel erst, wenn du ca. 100 Meter in der Nähe des Startpunkts bist.",
    maps: "Route zum Startpunkt öffnen",
    confirm: "Wir sind in der Nähe",
    back: "Zurück",
    rulesEmpty: "Für dieses Spiel sind noch keine Spielregeln hinterlegt.",
  },
  en: {
    rules: "How to play",
    start: "Start the game",
    modalTitle: "Are you at the start?",
    modalBody: "Only start the game when you are about 100 metres from the starting point.",
    maps: "Open walking directions",
    confirm: "We are nearby",
    back: "Back",
    rulesEmpty: "This game has no rules page yet.",
  },
} as const;

export function GameStartIntro({
  gameTitle,
  logoUrl,
  shortText,
  briefingIframeUrl,
  startCoords,
  language = "de",
  onContinue,
}: Props) {
  const t = COPY[language];
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mapsUrl = startCoords ? walkingDirectionsUrl(startCoords) : null;
  const text = shortText?.trim() || "";

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#f7f6f0]">
      <div className="relative h-[min(52vh,28rem)] w-full shrink-0 overflow-hidden bg-teal-900">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(165deg,#0f766e_0%,#134e4a_100%)]">
            <p className="px-6 text-center text-3xl font-extrabold tracking-tight text-white">
              {gameTitle}
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#f7f6f0] via-transparent to-black/25" />
      </div>

      <main className="relative z-[1] mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <h1 className="-mt-8 text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm sm:text-4xl">
          {gameTitle}
        </h1>
        {text ? (
          <p className="mt-4 whitespace-pre-wrap text-[1.05rem] leading-relaxed text-slate-600">
            {text}
          </p>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 pt-8">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="tap-lift inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-extrabold text-slate-800 shadow-sm"
          >
            <BookOpen size={20} strokeWidth={2.4} />
            {t.rules}
          </button>
          <LobbyPrimaryButton type="button" onClick={() => setConfirmOpen(true)}>
            {t.start}
            <Play size={18} strokeWidth={2.6} fill="currentColor" />
          </LobbyPrimaryButton>
        </div>
      </main>

      <PlayDocSheet
        open={rulesOpen}
        title={t.rules}
        url={briefingUrlWithLang(briefingIframeUrl, language)}
        emptyHint={t.rulesEmpty}
        onClose={() => setRulesOpen(false)}
      />

      {confirmOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-labelledby="start-confirm-title"
            className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
              <MapPin size={28} strokeWidth={2.4} />
            </div>
            <h2
              id="start-confirm-title"
              className="text-center text-xl font-extrabold text-slate-900"
            >
              {t.modalTitle}
            </h2>
            <p className="mt-3 text-center text-base leading-relaxed text-slate-600">
              {t.modalBody}
            </p>
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800"
              >
                <Navigation size={18} strokeWidth={2.4} />
                {t.maps}
              </a>
            ) : null}
            <div className="mt-5 flex flex-col gap-2">
              <LobbyPrimaryButton
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onContinue();
                }}
              >
                {t.confirm}
              </LobbyPrimaryButton>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="py-3 text-center text-sm font-semibold text-slate-500"
              >
                {t.back}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
