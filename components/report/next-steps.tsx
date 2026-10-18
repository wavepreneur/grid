import type { ReportCopy } from "@/components/report/report-copy";
import { ReportSection } from "@/components/report/report-section";
import { tierIncludes, type ReportTier } from "@/components/report/report-tiers";

export function NextSteps({ copy, tier }: { copy: ReportCopy; tier: ReportTier }) {
  const t = copy.nextSteps;
  const withContent = tierIncludes(tier, "understanding");
  const items = t.items.filter((item) => withContent || !item.needsContent);

  return (
    <ReportSection id="next-steps" title={t.title} lede={tier === "light" ? t.ledeTeamevent : t.lede}>
      <ol className="flex flex-col divide-y divide-[#EFEBE2]">
        {items.map((item) => (
          <li
            key={item.action}
            className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
          >
            <span aria-hidden className="hidden size-5 shrink-0 rounded-md border-[1.5px] border-[#B9B2A3] sm:block" />
            <p className="flex-1 font-medium leading-snug text-[#13261F]">{item.action}</p>
            <span className="self-start rounded-full bg-[#EAF2EF] px-3 py-1 text-sm font-medium text-[#0F5C4A] sm:self-center">
              {tier === "light" ? (item.whenTeamevent ?? item.when) : item.when}
            </span>
          </li>
        ))}
      </ol>
    </ReportSection>
  );
}
