import type { ReportCopy } from "@/components/report/report-copy";
import { weakestTask, type TaskResult } from "@/components/report/report-aggregates";
import { ExcludedNote, LockedSection, ReportSection } from "@/components/report/report-section";
import { tierIncludes, type ReportTier } from "@/components/report/report-tiers";

type Props = {
  copy: ReportCopy;
  tier: ReportTier;
  results: readonly TaskResult[];
  excluded: number;
  sessionHref: string;
};

export function TaskUnderstandingChart({ copy, tier, results, excluded, sessionHref }: Props) {
  const t = copy.understanding;

  if (!tierIncludes(tier, "understanding")) {
    return (
      <ReportSection id="understanding" title={t.title} printHidden>
        <LockedSection
          badge={copy.locked.badge}
          text={copy.locked.understanding}
          cta={copy.locked.cta}
          href={sessionHref}
        />
      </ReportSection>
    );
  }

  const titleOf = (task: TaskResult) => copy.demo.taskTitles[task.id] ?? task.title;
  const weakest = weakestTask(results);

  return (
    <ReportSection
      id="understanding"
      title={t.title}
      lede={t.lede(titleOf(weakest), weakest.correct, weakest.total)}
    >
      <ul className="flex flex-col gap-3">
        {results.map((task) => {
          const isWeakest = task.id === weakest.id;
          return (
            <li
              key={task.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 wide:grid-cols-[220px_minmax(0,1fr)_160px]"
            >
              <span className="flex items-center gap-2 text-sm">
                <span className="tabular-nums text-[#56655E]">{task.id}</span>
                <span className={isWeakest ? "font-semibold text-[#13261F]" : "text-[#13261F]"}>
                  {titleOf(task)}
                </span>
                {isWeakest ? (
                  <span className="rounded-full border border-[#C2553F] px-2 py-0.5 text-xs font-medium text-[#A3412E]">
                    {t.weakest}
                  </span>
                ) : null}
              </span>
              <span
                aria-hidden
                className="col-span-2 h-2.5 overflow-hidden rounded-full bg-[#F1EDE4] wide:col-span-1 wide:row-start-1 wide:col-start-2"
              >
                <span
                  className={`block h-full rounded-full ${isWeakest ? "bg-[#C2553F]" : "bg-[#0F5C4A]"}`}
                  style={{ width: `${task.pct}%` }}
                />
              </span>
              <span className="row-start-1 col-start-2 text-right text-sm tabular-nums text-[#3E4D47] wide:col-start-3">
                <span className={isWeakest ? "font-semibold text-[#A3412E]" : "font-medium text-[#13261F]"}>
                  {task.pct} %
                </span>
                <span className="text-[#56655E]"> · {t.teamsCorrect(task.correct, task.total)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {excluded > 0 ? <ExcludedNote text={copy.privacy.excluded(excluded)} /> : null}
    </ReportSection>
  );
}
