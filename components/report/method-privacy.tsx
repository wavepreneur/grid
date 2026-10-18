import type { ReportCopy } from "@/components/report/report-copy";
import { ReportSection } from "@/components/report/report-section";
import type { ReportTier } from "@/components/report/report-tiers";

type Props = {
  copy: ReportCopy;
  tier: ReportTier;
  /** Unset until legal confirms; rendered as a visible placeholder. */
  retention?: string;
  contact?: string;
};

export function MethodPrivacy({ copy, tier, retention, contact }: Props) {
  const t = copy.method;
  const rows = [
    { label: t.rolesLabel, value: t.roles },
    { label: t.aiLabel, value: t.ai },
    { label: t.minGroupLabel, value: t.minGroup },
    { label: t.retentionLabel, value: retention, placeholder: !retention },
    { label: t.dataLabel, value: t.data[tier] },
    { label: t.contactLabel, value: contact, placeholder: !contact },
  ];

  return (
    <div className="print:break-before-page">
      <ReportSection id="method" title={t.title} lede={t.lede}>
        <div className="grid gap-8 wide:grid-cols-2">
          <FactList title={t.measuredTitle} items={t.measured} />
          <FactList title={t.notMeasuredTitle} items={t.notMeasured} />
        </div>

        <dl className="mt-8 divide-y divide-[#EFEBE2] border-t border-[#EFEBE2]">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-1 py-4 last:pb-0 wide:grid-cols-[200px_minmax(0,1fr)] wide:gap-6">
              <dt className="text-sm font-semibold text-[#13261F]">{row.label}</dt>
              <dd className="max-w-[68ch] leading-relaxed text-[#3E4D47]">
                {row.placeholder ? (
                  <span className="rounded border border-dashed border-[#B9B2A3] px-2 py-0.5 text-sm text-[#56655E]">
                    {t.placeholder}
                  </span>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </ReportSection>
    </div>
  );
}

function FactList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#13261F]">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2 text-[#3E4D47]">
        {items.map((item) => (
          <li key={item} className="flex gap-3 leading-snug">
            <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-[#B9B2A3]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
