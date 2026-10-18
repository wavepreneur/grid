import Link from "next/link";
import { EyeOff } from "lucide-react";
import type { TrendPoint } from "@/components/report/example-data";
import type { ReportCopy } from "@/components/report/report-copy";
import { LockedSection, ReportSection } from "@/components/report/report-section";
import { MIN_GROUP_SIZE, tierIncludes, type ReportTier } from "@/components/report/report-tiers";

type Props = {
  copy: ReportCopy;
  tier: ReportTier;
  team: string;
  teamPlayers: number;
  points: readonly TrendPoint[];
  plansHref: string;
};

const W = 640;
const H = 220;
const PAD = { top: 28, right: 24, bottom: 32, left: 36 };
const Y_MIN = 40;
const Y_MAX = 100;
const GRID = [50, 75, 100];

export function TrendChart({ copy, tier, team, teamPlayers, points, plansHref }: Props) {
  const t = copy.overTime;

  if (!tierIncludes(tier, "overTime")) {
    return (
      <ReportSection id="over-time" title={t.title} printHidden>
        <LockedSection badge={t.lockedBadge} text={t.locked} cta={t.lockedCta} href={plansHref} />
      </ReportSection>
    );
  }

  if (teamPlayers < MIN_GROUP_SIZE) {
    return (
      <ReportSection id="over-time" title={t.title}>
        <p className="flex items-center gap-1.5 text-sm text-[#56655E]">
          <EyeOff aria-hidden size={14} className="shrink-0" />
          {copy.privacy.hidden}
        </p>
      </ReportSection>
    );
  }

  if (points.length < 2) {
    return (
      <ReportSection id="over-time" title={t.title}>
        <div className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-snug text-[#3E4D47]">{t.empty}</p>
          <Link
            href={plansHref}
            className="rounded-full border border-[#0F5C4A] px-4 py-2 text-sm font-medium text-[#0F5C4A] transition-colors hover:bg-[#0F5C4A] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5C4A] print:hidden"
          >
            {t.emptyCta}
          </Link>
        </div>
      </ReportSection>
    );
  }

  const x = (index: number) =>
    PAD.left + (index / (points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (score: number) =>
    PAD.top + (1 - (score - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD.top - PAD.bottom);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.score)}`).join(" ");
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const reorgIndex = points.findIndex((p) => p.note === "reorg");
  const sentence = `${t.sentence(team, first.score, last.score, points.length)}${
    reorgIndex >= 0 ? ` ${t.reorgNote}` : ""
  }`;
  const label = t.chartLabel(
    team,
    points.map((p) => `${t.session(p.session)} ${p.score}${p.note === "reorg" ? ` (${t.reorg})` : ""}`).join(", "),
  );

  return (
    <ReportSection id="over-time" title={t.title} lede={t.lede(team)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full">
        {GRID.map((value) => (
          <g key={value}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(value)} y2={y(value)} stroke="#EFEBE2" />
            <text x={PAD.left - 10} y={y(value) + 4} textAnchor="end" fontSize="11" fill="#56655E">
              {value}
            </text>
          </g>
        ))}

        {reorgIndex > 0 ? (
          <g>
            <line
              x1={x(reorgIndex - 0.5)}
              x2={x(reorgIndex - 0.5)}
              y1={PAD.top - 12}
              y2={H - PAD.bottom}
              stroke="#56655E"
              strokeDasharray="3 3"
            />
            <text x={x(reorgIndex - 0.5) + 6} y={PAD.top - 4} fontSize="11" fill="#3E4D47">
              {t.reorg}
            </text>
          </g>
        ) : null}

        <path d={path} fill="none" stroke="#0F5C4A" strokeWidth="2.5" strokeLinejoin="round" />

        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <g key={p.session}>
              <circle
                cx={x(i)}
                cy={y(p.score)}
                r={isLast ? 5.5 : 4}
                fill={isLast ? "#0F5C4A" : "#fff"}
                stroke="#0F5C4A"
                strokeWidth="2"
              />
              <text
                x={x(i)}
                y={y(p.score) - 12}
                textAnchor="middle"
                fontSize="12"
                fontWeight={isLast ? 700 : 500}
                fill="#13261F"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {p.score}
              </text>
              <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#56655E">
                {t.session(p.session)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-4 leading-snug text-[#3E4D47]">{sentence}</p>
    </ReportSection>
  );
}
