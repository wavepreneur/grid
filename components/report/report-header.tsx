import { ShieldCheck } from "lucide-react";
import type { ReportCopy } from "@/components/report/report-copy";
import type { ReportTier } from "@/components/report/report-tiers";

type Props = {
  copy: ReportCopy;
  tier: ReportTier;
  title: string;
  company?: string;
  date: string;
  minutes: number;
  teamCount: number;
  playerCount: number;
  game: string;
};

export function ReportHeader({
  copy,
  tier,
  title,
  company,
  date,
  minutes,
  teamCount,
  playerCount,
  game,
}: Props) {
  const t = copy.header;
  const dateLabel = new Intl.DateTimeFormat(copy.locale, { dateStyle: "long" }).format(new Date(date));
  const meta = [dateLabel, t.minutes(minutes), t.teams(teamCount), t.players(playerCount), t.game(game)];

  return (
    <header className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-3 text-sm text-[#56655E]">
          <span className="font-display text-lg font-bold tracking-tight text-[#13261F]">tells</span>
          <span aria-hidden className="h-4 w-px bg-[#E6E1D6]" />
          {t.tier[tier]}
        </p>
        {tier === "year" ? (
          <span className="grid h-10 w-28 place-items-center rounded-lg border border-dashed border-[#D5CEBF] text-xs text-[#56655E]">
            {t.logo}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-tight tracking-[-0.02em] text-[#13261F]">
          {company ? <span className="text-[#56655E]">{company} · </span> : null}
          {title}
        </h1>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums text-[#56655E]">
          {meta.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="flex items-center gap-2 text-sm font-medium text-[#0F5C4A]">
        <ShieldCheck aria-hidden size={16} strokeWidth={2} />
        {t.privacy}
      </p>
    </header>
  );
}
