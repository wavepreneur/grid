"use client";

import { useState } from "react";
import { BookOpen, MapPin, Navigation, Play } from "lucide-react";
import { PlayDocSheet } from "@/components/game/play-doc-sheet";
import { LanguageBadge } from "@/components/grid/language-badge";
import { LobbyPrimaryButton } from "@/components/lobby/lobby-identity";
import { playUi, playUiLang } from "@/lib/grid/play-ui";
import { walkingDirectionsUrl, type StartCoords } from "@/lib/grid/start-location";

type Props = {
  gameTitle: string;
  logoUrl?: string | null;
  shortText?: string | null;
  briefingIframeUrl?: string | null;
  startCoords?: StartCoords | null;
  language?: string | null;
  onContinue: () => void;
};

function briefingUrlWithLang(url: string | null | undefined, language: string): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  const lang = playUiLang(language);
  try {
    const parsed = new URL(raw);
    if (!parsed.searchParams.has("lang")) parsed.searchParams.set("lang", lang);
    return parsed.toString();
  } catch {
    return raw;
  }
}

export function GameStartIntro({
  gameTitle,
  logoUrl,
  shortText,
  briefingIframeUrl,
  startCoords,
  language = "de",
  onContinue,
}: Props) {
  const t = playUi(language);
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
        <div className="-mt-6 flex items-center justify-center gap-2">
          <h1 className="text-center text-[1.35rem] font-extrabold leading-snug tracking-tight text-slate-900 sm:text-2xl">
            {gameTitle}
          </h1>
          <LanguageBadge language={language} />
        </div>
        {text ? (
          <p className="mt-3 whitespace-pre-wrap text-center text-[1.05rem] leading-relaxed text-slate-600">
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
            {t.intro.rules}
          </button>
          <LobbyPrimaryButton type="button" onClick={() => setConfirmOpen(true)}>
            {t.intro.start}
            <Play size={18} strokeWidth={2.6} fill="currentColor" />
          </LobbyPrimaryButton>
        </div>
      </main>

      <PlayDocSheet
        open={rulesOpen}
        title={t.intro.rules}
        url={briefingUrlWithLang(briefingIframeUrl, language ?? "de")}
        emptyHint={t.intro.rulesEmpty}
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
              {t.intro.modalTitle}
            </h2>
            <p className="mt-3 text-center text-base leading-relaxed text-slate-600">
              {t.intro.modalBody}
            </p>
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800"
              >
                <Navigation size={18} strokeWidth={2.4} />
                {t.intro.maps}
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
                {t.intro.confirm}
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
