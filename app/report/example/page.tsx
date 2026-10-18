import type { Metadata } from "next";
import Link from "next/link";
import { EXAMPLE_REPORT } from "@/components/report/example-data";
import { TeamComparison } from "@/components/report/team-comparison";
import { CollaborationPanel } from "@/components/report/collaboration-panel";
import { ExecutiveSummary } from "@/components/report/executive-summary";
import { NextSteps } from "@/components/report/next-steps";
import { TaskUnderstandingChart } from "@/components/report/task-understanding-chart";
import { TrendChart } from "@/components/report/trend-chart";
import { MethodPrivacy } from "@/components/report/method-privacy";
import { ReportPrintStyles } from "@/components/report/report-print-styles";
import { ReportError, ReportProcessing, ReportSkeleton } from "@/components/report/report-states";
import { hintTotals, splitTeams, taskResults, weakestTask } from "@/components/report/report-aggregates";
import { PrintButton } from "@/components/report/print-button";
import { parseLang, REPORT_LANGS, reportCopy } from "@/components/report/report-copy";
import { ReportHeader } from "@/components/report/report-header";
import { parseTier, REPORT_TIERS, type ReportTier } from "@/components/report/report-tiers";

export const metadata: Metadata = {
  title: "Tells · Example team report",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExampleReportPage({ searchParams }: Props) {
  const params = await searchParams;
  const tier = parseTier(params.tier);
  const lang = parseLang(params.lang);
  const copy = reportCopy(lang);
  const data = EXAMPLE_REPORT;
  const state = typeof params.state === "string" ? params.state : undefined;
  const small = state === "small";
  const roleWait = small
    ? data.roleWait.map((row) => (row.role === "Alpha" ? { ...row, people: 3 } : row))
    : data.roleWait;
  const teams = small
    ? data.teams.map((team) => (team.name === "Bison" ? { ...team, players: 4 } : team))
    : data.teams;
  const playerCount = teams.reduce((sum, team) => sum + team.players, 0);
  const { counted, excluded } = splitTeams(teams);
  const results = taskResults(data.tasks, counted);
  const weakest = weakestTask(results);
  const hints = hintTotals(counted, weakest.id);
  const trendTeam = teams.find((team) => team.name === data.trend.team);
  const trendPoints = state === "first" ? data.trend.points.slice(-1) : data.trend.points;
  const href = (next: { tier?: ReportTier; lang?: string }) =>
    `?tier=${next.tier ?? tier}&lang=${next.lang ?? lang}${state ? `&state=${state}` : ""}`;

  return (
    <div className="tells-report min-h-dvh bg-[#F8F5EE] font-sans text-[#13261F] print:bg-white">
      <nav
        aria-label={copy.demo.preview}
        className="sticky top-0 z-10 border-b border-[#E6E1D6] bg-[#F8F5EE]/90 backdrop-blur print:hidden"
      >
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-sm">
          <span className="text-[#56655E]">{copy.demo.preview}</span>
          <div className="flex rounded-full border border-[#E6E1D6] bg-white p-0.5">
            {REPORT_TIERS.map((item) => (
              <Link
                key={item}
                href={href({ tier: item })}
                aria-current={item === tier ? "page" : undefined}
                className={`rounded-full px-3 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F5C4A] ${
                  item === tier ? "bg-[#13261F] text-white" : "text-[#3E4D47] hover:text-[#13261F]"
                }`}
              >
                {copy.demo.tiers[item]}
              </Link>
            ))}
          </div>
          <div className="flex gap-3 uppercase">
            {REPORT_LANGS.map((item) => (
              <Link
                key={item}
                href={href({ lang: item })}
                aria-current={item === lang ? "page" : undefined}
                className={item === lang ? "font-semibold text-[#13261F]" : "text-[#56655E] hover:text-[#13261F]"}
              >
                {item}
              </Link>
            ))}
          </div>
          <span className="ml-auto">
            <PrintButton label={copy.demo.print} />
          </span>
        </div>
      </nav>

      <ReportPrintStyles footer={copy.print.footer} />
      <main className="mx-auto flex max-w-[1080px] flex-col gap-10 px-6 py-12 md:py-16 print:max-w-none print:gap-8 print:p-0">
        <ReportHeader
          copy={copy}
          tier={tier}
          title={tier === "light" ? data.teameventTitle : data.session}
          company={tier === "light" ? undefined : data.company}
          date={data.date}
          minutes={data.minutes}
          teamCount={data.teams.length}
          playerCount={playerCount}
          game={data.game}
        />
        {state === "loading" ? (
          <ReportSkeleton copy={copy} />
        ) : state === "processing" ? (
          <ReportProcessing copy={copy} />
        ) : state === "error" ? (
          <ReportError copy={copy} retryHref={`?tier=${tier}&lang=${lang}`} />
        ) : (
        <>
        <ExecutiveSummary
          copy={copy}
          tier={tier}
          averageScore={data.averageScore}
          teamScores={teams.map((team) => team.score)}
          tellContext={{ wrong: weakest.total - weakest.correct, counted: weakest.total, teams: teams.length }}
          sessionHref="/#pricing"
        />
        <NextSteps copy={copy} tier={tier} />
        <TaskUnderstandingChart
          copy={copy}
          tier={tier}
          results={results}
          excluded={excluded}
          sessionHref="/#pricing"
        />
        <CollaborationPanel
          copy={copy}
          roleWait={roleWait}
          teamAvgWait={data.teamAvgWait}
          handoffs={data.handoffs}
          hints={hints}
          weakestTaskId={weakest.id}
          excluded={excluded}
        />
        <TeamComparison
          copy={copy}
          teams={teams}
          averageScore={data.averageScore}
          benchmark={data.benchmark.tellsAverage}
        />
        <TrendChart
          copy={copy}
          tier={tier}
          team={data.trend.team}
          teamPlayers={trendTeam?.players ?? 0}
          points={trendPoints}
          plansHref="/#pricing"
        />
        <MethodPrivacy copy={copy} tier={tier} />
        </>
        )}
      </main>
    </div>
  );
}
