"use client";

import Link from "next/link";
import {
  coveragePercent,
  type TranslationCoverage,
} from "@/lib/cms/game-i18n";
import {
  STUDIO_TAB_LOCALES,
  localeFlag,
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
  variant?: "compact" | "comfortable";
};

export function GameLanguageCell({
  gameId,
  locales,
  sourceLocale,
  activeLocale,
  coverageByLocale,
  onAdd,
  adding,
  variant = "compact",
}: Props) {
  const have = new Set(locales);
  const extra = locales.filter((locale) => !STUDIO_TAB_LOCALES.includes(locale));
  const shown = [...STUDIO_TAB_LOCALES, ...extra];
  const comfortable = variant === "comfortable";

  return (
    <div className={`flex flex-wrap items-center ${comfortable ? "gap-2" : "gap-1"}`}>
      {shown.map((language) => {
        const short = localeShort(language);
        const label = localeLabel(language);
        const current = (activeLocale ?? sourceLocale) === language;
        const isSource = language === sourceLocale;
        if (have.has(language) || current) {
          const coverage = !isSource ? coverageByLocale?.[language] : undefined;
          const percent = coverage ? coveragePercent(coverage) : !isSource ? 0 : null;
          const complete = percent === 100;
          const tone = current
            ? "bg-primary text-primary-foreground"
            : complete || isSource
              ? "bg-secondary text-foreground hover:bg-secondary/80"
              : "bg-amber-100 text-amber-900 hover:bg-amber-200";
          return (
            <Link
              key={language}
              href={`/admin/games/${gameId}?lang=${language}`}
              title={
                isSource
                  ? `${label} · Ausgangssprache`
                  : `${label} · ${percent ?? 0}% bestätigt`
              }
              className={
                comfortable
                  ? `inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold ${tone}`
                  : `inline-flex min-h-7 min-w-7 flex-col items-center justify-center rounded-lg px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide ${tone}`
              }
            >
              <span className={comfortable ? "text-sm leading-none" : undefined} aria-hidden>
                {localeFlag(language)}
              </span>
              {short}
              {percent !== null ? (
                <span
                  className={
                    comfortable
                      ? "text-[11px] font-semibold opacity-80"
                      : "text-[8px] font-bold leading-none"
                  }
                >
                  {percent}%
                </span>
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
            className={
              comfortable
                ? "inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
                : "inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-dashed border-border px-1.5 text-[10px] font-extrabold tracking-wide text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
            }
          >
            <span className={comfortable ? "text-sm leading-none" : undefined} aria-hidden>
              {localeFlag(language)}
            </span>
            {short}
          </button>
        );
      })}
    </div>
  );
}
