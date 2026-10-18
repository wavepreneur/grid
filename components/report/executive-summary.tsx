import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import type { ReportCopy } from "@/components/report/report-copy";
import type { ReportTier } from "@/components/report/report-tiers";

type Props = {
  copy: ReportCopy;
  tier: ReportTier;
  averageScore: number;
  teamScores: readonly number[];
  tellContext: Parameters<ReportCopy["summary"]["tells"]>[0];
  sessionHref: string;
};

export function ExecutiveSummary({ copy, tier, averageScore, teamScores, tellContext, sessionHref }: Props) {
  const t = copy.summary;
  const allTells = t.tells(tellContext);
  const tells = tier === "light" ? allTells.slice(1) : allTells;
  const low = Math.min(...teamScores);
  const high = Math.max(...teamScores);

  return (
    <section
      aria-labelledby="summary-verdict"
      className="break-inside-avoid rounded-2xl border border-[#E6E1D6] bg-white shadow-[0_1px_2px_rgba(19,38,31,0.04),0_8px_24px_rgba(19,38,31,0.05)] print:break-after-page print:shadow-none"
    >
      <div className="grid gap-8 p-8 wide:grid-cols-[minmax(0,240px)_minmax(0,1fr)] wide:items-end wide:p-10">
        <div>
          <p className="text-sm font-medium text-[#56655E]">{t.scoreLabel}</p>
          <p className="mt-1 flex items-baseline gap-2 font-display tabular-nums text-[#13261F]">
            <span className="text-[88px] font-semibold leading-none tracking-[-0.04em]">{averageScore}</span>
            <span className="text-base font-medium text-[#56655E]">{t.outOf}</span>
          </p>
          <ScoreStrip
            label={t.strip(low, high, averageScore)}
            average={averageScore}
            scores={teamScores}
            low={low}
            high={high}
          />
        </div>
        <h2
          id="summary-verdict"
          className="font-display text-[clamp(24px,2.6vw,32px)] font-semibold leading-snug tracking-[-0.015em] text-[#13261F] wide:pb-3"
        >
          {t.verdict[tier]}
        </h2>
      </div>

      <div className="border-t border-[#E6E1D6] px-8 pb-8 pt-6 wide:px-10 wide:pb-10">
        <h3 className="text-sm font-semibold text-[#13261F]">{t.tellsTitle(tells.length)}</h3>

        <div
          aria-hidden
          className="mt-4 hidden grid-cols-[28px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6 text-xs font-medium text-[#56655E] wide:grid"
        >
          <span />
          <span>{t.happened}</span>
          <span>{t.matters}</span>
          <span>{t.action}</span>
        </div>

        <ol className="mt-2 divide-y divide-[#EFEBE2]">
          {tells.map((tell, index) => {
            const key = index === 0;
            return (
              <li
                key={tell.happened}
                className="relative grid gap-2 py-5 wide:grid-cols-[28px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] wide:gap-6"
              >
                {key ? (
                  <span aria-hidden className="absolute -left-8 top-5 bottom-5 w-[3px] rounded-full bg-[#E8A33D] wide:-left-10" />
                ) : null}
                <span className="font-display text-sm font-semibold tabular-nums text-[#56655E]">
                  {index + 1}
                </span>
                <p className="font-medium leading-snug text-[#13261F]">
                  <span className="sr-only">{t.happened}: </span>
                  {tell.happened}
                </p>
                <p className="leading-snug text-[#3E4D47]">
                  <span className="text-xs font-medium text-[#56655E] wide:sr-only">{t.matters}: </span>
                  {tell.matters}
                </p>
                <p className="flex gap-2 leading-snug text-[#0F5C4A]">
                  <ArrowRight aria-hidden size={16} className="mt-[3px] shrink-0" />
                  <span>
                    <span className="sr-only">{t.action}: </span>
                    {tell.action}
                  </span>
                </p>
              </li>
            );
          })}
        </ol>

        {tier === "light" ? (
          <div className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-[#D5CEBF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p className="flex gap-3 text-sm leading-snug text-[#3E4D47]">
              <Lock aria-hidden size={16} className="mt-[2px] shrink-0 text-[#56655E]" />
              {t.lockedLight}
            </p>
            <Link
              href={sessionHref}
              className="shrink-0 rounded-full border border-[#0F5C4A] px-4 py-2 text-sm font-medium text-[#0F5C4A] transition-colors hover:bg-[#0F5C4A] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5C4A] print:hidden"
            >
              {t.lockedLightCta}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ScoreStrip({
  label,
  average,
  scores,
  low,
  high,
}: {
  label: string;
  average: number;
  scores: readonly number[];
  low: number;
  high: number;
}) {
  return (
    <div className="mt-5">
      <div
        role="img"
        aria-label={label}
        className="relative h-6"
      >
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#E6E1D6]" />
        <span
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#0F5C4A]/25"
          style={{ left: `${low}%`, width: `${high - low}%` }}
        />
        {scores.map((score, index) => (
          <span
            key={index}
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0F5C4A]/55"
            style={{ left: `${score}%` }}
          />
        ))}
        <span
          className="absolute top-0 h-6 w-[2px] -translate-x-1/2 rounded-full bg-[#13261F]"
          style={{ left: `${average}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-[#56655E]">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
}
