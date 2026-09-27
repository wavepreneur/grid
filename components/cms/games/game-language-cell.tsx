"use client";

import Link from "next/link";
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
  onAdd: (language: StudioLanguage) => void;
  adding?: boolean;
};

export function GameLanguageCell({
  gameId,
  locales,
  sourceLocale,
  activeLocale,
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
        if (have.has(language) || current) {
          return (
            <Link
              key={language}
              href={`/admin/games/${gameId}?lang=${language}`}
              title={`${label}${language === sourceLocale ? " · Ausgangssprache" : ""}`}
              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[10px] font-extrabold tracking-wide ${
                current
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              {short}
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
