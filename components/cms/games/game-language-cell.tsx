"use client";

import Link from "next/link";
import {
  coveragePercent,
  type TranslationCoverage,
} from "@/lib/cms/game-i18n";
import {
  LAUNCH_LOCALES,
  localeLabel,
  localeShort,
  type StudioLanguage,
} from "@/lib/cms/languages";

type Props = {
  gameId: string;
  locales: StudioLanguage[];
  sourceLocale: StudioLanguage;
  activeLocale?: StudioLanguage;
  coverageByLocale?: Partial<Record<StudioLanguage, TranslationCoverage>>;
  onAdd: (language: StudioLanguage) => void;
  adding?: boolean;
};

export function GameLanguageCell({
  gameId,
  locales,
  sourceLocale,
  activeLocale,
  coverageByLocale,
  onAdd,
  adding,
}: Props) {
  const have = new Set(locales);
  const extra = locales.filter((locale) => !LAUNCH_LOCALES.includes(locale));
  const shown = [...LAUNCH_LOCALES, ...extra];

  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((language) => {
        const short = localeShort(language);
        const label = localeLabel(language);
        const current = (activeLocale ?? sourceLocale) === language;
        const isSource = language === sourceLocale;
        if (have.has(language) || current) {
          const coverage = !isSource ? coverageByLocale?.[language] : undefined;
          const percent = coverage ? coveragePercent(coverage) : !isSource ? 0 : null;
          const complete = percent === 100;
          return (
            <Link
              key={language}
              href={`/admin/games/${gameId}?lang=${language}`}
              title={
                isSource
                  ? `${label} · Ausgangssprache`
                  : `${label} · ${percent ?? 0}% bestätigt`
              }
              className={`inline-flex min-h-7 min-w-7 flex-col items-center justify-center rounded-lg px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide ${
                current
                  ? "bg-primary text-primary-foreground"
                  : complete || isSource
                    ? "bg-secondary text-foreground hover:bg-secondary/80"
                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
              }`}
            >
              {short}
              {percent !== null ? (
                <span className="text-[8px] font-bold leading-none">{percent}%</span>
              ) : null}
            </Link>
          );
        }
        return (
          <button
            key={language}
            type="button"
            disabled={adding}
            title={`${label} anlegen — Texte kopieren, dann übersetzen`}
            onClick={() => onAdd(language)}
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-dashed border-border px-1.5 text-[10px] font-extrabold tracking-wide text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}
