import { Check, EyeOff, Minus } from "lucide-react";
import type { ReportTeam, TeamDriver } from "@/components/report/example-data";
import type { ReportCopy } from "@/components/report/report-copy";
import { ReportSection } from "@/components/report/report-section";
import { MIN_GROUP_SIZE } from "@/components/report/report-tiers";

type Props = {
  copy: ReportCopy;
  teams: readonly ReportTeam[];
  averageScore: number;
  benchmark: number;
};

type Tone = "positive" | "neutral" | "negative";

function toneOf(driver: TeamDriver): Tone {
  if (driver.kind === "hints") return driver.count >= 3 ? "negative" : "neutral";
  return driver.kind === "missedTask" || driver.kind === "fewestHandoffs" ? "negative" : "positive";
}

function ToneIcon({ tone }: { tone: Tone }) {
  if (tone === "neutral") {
    return <span aria-hidden className="mx-[4px] size-1.5 shrink-0 rounded-full bg-[#8A968F]" />;
  }
  const Icon = tone === "negative" ? Minus : Check;
  return (
    <Icon
      aria-hidden
      size={14}
      strokeWidth={2.5}
      className={`shrink-0 ${tone === "negative" ? "text-[#A3412E]" : "text-[#0F5C4A]"}`}
    />
  );
}

export function TeamComparison({ copy, teams, averageScore, benchmark }: Props) {
  const t = copy.comparison;
  const ranked = [...teams].sort((a, b) => b.score - a.score);

  const driverText = (driver: TeamDriver) => {
    switch (driver.kind) {
      case "solvedTask":
      case "missedTask":
        return t.drivers[driver.kind](t.task(driver.task.replace(/\D/g, "")));
      case "hints":
        return t.drivers.hints(driver.count);
      default:
        return t.drivers[driver.kind];
    }
  };

  return (
    <ReportSection id="comparison" title={t.title} lede={t.lede}>
      <div className="mb-6 flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-[#EFEBE2] pb-6">
        <p className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-semibold tabular-nums text-[#13261F]">{averageScore}</span>
          <span className="text-sm text-[#3E4D47]">{t.yours}</span>
        </p>
        <p className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-semibold tabular-nums text-[#56655E]">{benchmark}</span>
          <span className="text-sm text-[#3E4D47]">{t.benchmark}</span>
        </p>
      </div>

      <ol className="flex flex-col divide-y divide-[#EFEBE2]">
        {ranked.map((team, index) => {
          const hidden = team.players < MIN_GROUP_SIZE;
          return (
            <li
              key={team.name}
              className="grid grid-cols-[32px_minmax(0,1fr)_auto] gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0 wide:grid-cols-[32px_180px_minmax(0,1fr)_200px] wide:items-center"
            >
              <span className="font-display text-lg font-semibold tabular-nums text-[#56655E]">
                <span className="sr-only">{t.rank(index + 1)}: </span>
                <span aria-hidden>{index + 1}</span>
              </span>
              <span className="flex flex-col">
                <span className="font-semibold text-[#13261F]">{team.name}</span>
                <span className="text-xs tabular-nums text-[#56655E]">{t.players(team.players)}</span>
              </span>
              <span className="flex items-center gap-3 wide:order-last">
                <span aria-hidden className="hidden h-2.5 flex-1 overflow-hidden rounded-full bg-[#F1EDE4] wide:block">
                  <span className="block h-full rounded-full bg-[#0F5C4A]" style={{ width: `${team.score}%` }} />
                </span>
                <span className="w-8 text-right font-display text-lg font-semibold tabular-nums text-[#13261F]">
                  {team.score}
                </span>
              </span>
              {hidden ? (
                <p className="col-span-2 col-start-2 flex items-center gap-1.5 text-sm text-[#56655E] wide:col-span-1 wide:col-start-auto">
                  <EyeOff aria-hidden size={14} className="shrink-0" />
                  {copy.privacy.hidden}
                </p>
              ) : (
                <ul className="col-span-2 col-start-2 flex flex-wrap gap-x-4 gap-y-1 text-sm wide:col-span-1 wide:col-start-auto">
                  {team.drivers.map((driver) => (
                    <li key={driver.kind} className="flex items-center gap-1.5 text-[#3E4D47]">
                      <ToneIcon tone={toneOf(driver)} />
                      {driverText(driver)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </ReportSection>
  );
}
