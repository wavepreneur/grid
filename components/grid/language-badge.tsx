import {
  localeFlag,
  localeLabel,
  localeShort,
  parseStudioLanguage,
} from "@/lib/cms/languages";

type Props = {
  language?: string | null;
  className?: string;
};

export function LanguageBadge({ language, className = "" }: Props) {
  const id = parseStudioLanguage(language);
  const label = localeLabel(id);
  const flag = localeFlag(id);
  const short = localeShort(id);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-extrabold tracking-wide text-slate-700 shadow-sm ring-1 ring-slate-200 ${className}`}
      title={label}
      aria-label={label}
    >
      <span className="text-[1.05rem] leading-none" aria-hidden>
        {flag}
      </span>
      {short}
    </span>
  );
}
