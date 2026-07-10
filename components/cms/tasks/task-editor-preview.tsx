"use client";

import { useMemo } from "react";
import type { StudioTaskContent } from "@/lib/cms/types";
import { defaultTaskScoring } from "@/lib/cms/task-content";
import { tileTypeIcon } from "@/lib/grid/level-content";
import { LevelScoringBar } from "@/components/game/level-scoring-bar";
import { hasLiveLevelScoring } from "@/lib/grid/level-scoring";

type Props = {
  title: string;
  description: string;
  content: StudioTaskContent;
};

export function TaskEditorPreview({ title, description, content }: Props) {
  const tiles = content.tiles ?? [];
  const scoring = content.scoring ?? defaultTaskScoring();
  const previewStartedAt = useMemo(() => new Date().toISOString(), []);
  const tileGridClass =
    tiles.length === 1
      ? "mx-auto grid max-w-[11rem] grid-cols-1"
      : tiles.length === 2
        ? "mx-auto grid max-w-md grid-cols-2 gap-3"
        : "grid grid-cols-2 gap-3 sm:grid-cols-3";

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#f3f0ea] shadow-lg">
      <div className="max-h-[640px] overflow-y-auto p-4">
        {content.hero_image_url ? (
          <div className="mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.hero_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div className="mt-4 text-center">
          <h3 className="font-serif text-2xl font-bold uppercase tracking-wide text-slate-900">
            {title || "Neue Aufgabe"}
          </h3>
          {description ? (
            <p className="mt-3 text-left text-sm leading-6 text-slate-700 whitespace-pre-line">
              {description}
            </p>
          ) : null}
        </div>

        {tiles.length > 0 ? (
          <div className="mt-6">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-800">
              Kacheln
            </p>
            <div className={`mt-3 ${tileGridClass}`}>
              {tiles.map((tile) => (
                <div key={tile.id} className="space-y-1">
                  <div className="aspect-square overflow-hidden rounded-2xl border border-teal-900/30 bg-[#1a4d52] shadow-md">
                    {tile.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tile.cover_image_url}
                        alt={tile.label ?? "Kachel"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-white">
                        <span className="text-3xl">{tileTypeIcon(tile.media_type)}</span>
                        <span className="text-center text-[10px] font-semibold uppercase tracking-wide">
                          {tile.label ?? tile.media_type}
                        </span>
                      </div>
                    )}
                  </div>
                  {tile.hint_text?.trim() ? (
                    <p className="rounded-lg border border-sky-200 bg-white/80 px-2 py-1 text-[10px] text-slate-600">
                      Tipp · {tile.hint_point_cost ?? 50}P
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {content.question ? (
          <div className="mt-6">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-800">
              Frage
            </p>
            <div className="mt-3 rounded-2xl bg-[#e8913a] px-4 py-4 text-center text-sm font-semibold text-white shadow-sm">
              {content.question}
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          {content.answer_type === "text" ? (
            <div className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-400">
              Lösung eingeben…
            </div>
          ) : content.options?.length ? (
            <div className="space-y-2">
              {content.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${
                    opt.correct
                      ? "border-teal-400 bg-teal-50 text-teal-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {opt.label || "Antwortoption"}
                  {opt.correct ? " ✓" : ""}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {hasLiveLevelScoring(scoring) ? (
          <div className="mt-4">
            <LevelScoringBar scoring={scoring} startedAt={previewStartedAt} compact />
          </div>
        ) : scoring.points !== 0 ? (
          <div className="mt-4 flex justify-center">
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-600 shadow-sm">
              {scoring.points >= 0 ? "+" : ""}
              {scoring.points} P
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
