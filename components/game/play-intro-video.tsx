"use client";

import { Maximize2, Play } from "lucide-react";
import { LobbyPrimaryButton } from "@/components/lobby/lobby-identity";
import { youtubeEmbedUrl } from "@/lib/grid/game-help-links";
import { playUi } from "@/lib/grid/play-ui";

type Props = {
  youtubeUrl: string;
  language?: string | null;
  onContinue: () => void;
};

export function PlayIntroVideo({ youtubeUrl, language, onContinue }: Props) {
  const t = playUi(language);
  const embed = youtubeEmbedUrl(youtubeUrl);

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#f7f6f0]">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.22em] text-teal-700">
          {t.introVideo.title}
        </p>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
          {t.introVideo.subtitle}
        </p>

        <div className="mt-6 overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-[0_22px_40px_-24px_rgba(15,23,42,0.55)] ring-1 ring-slate-200">
          {embed ? (
            <div className="relative aspect-video w-full bg-black">
              <iframe
                title={t.introVideo.title}
                src={embed}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-slate-800 px-6 text-center text-sm font-medium text-slate-300">
              <Play size={22} className="mr-2 shrink-0" />
              Video nicht verfügbar
            </div>
          )}
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400">
          <Maximize2 size={14} strokeWidth={2.4} />
          {t.introVideo.fullscreenHint}
        </p>

        <div className="mt-auto pt-8">
          <LobbyPrimaryButton type="button" onClick={onContinue}>
            {t.introVideo.continue}
          </LobbyPrimaryButton>
        </div>
      </main>
    </div>
  );
}
