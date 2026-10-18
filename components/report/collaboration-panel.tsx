import { EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import type { Handoff, RoleWait } from "@/components/report/example-data";
import type { ReportCopy } from "@/components/report/report-copy";
import { ReportSection } from "@/components/report/report-section";
import { MIN_GROUP_SIZE } from "@/components/report/report-tiers";

type Props = {
  copy: ReportCopy;
  roleWait: readonly RoleWait[];
  teamAvgWait: number;
  handoffs: readonly Handoff[];
  hints: { total: number; onTask: number };
  weakestTaskId: string;
  excluded: number;
};

const WAIT_SCALE = 60;

export function CollaborationPanel({
  copy,
  roleWait,
  teamAvgWait,
  handoffs,
  hints,
  weakestTaskId,
  excluded,
}: Props) {
  const t = copy.collaboration;
  const visibleWaits = roleWait.filter((row) => row.people >= MIN_GROUP_SIZE);
  const longest = visibleWaits.reduce<RoleWait | null>(
    (top, row) => (!top || row.seconds > top.seconds ? row : top),
    null,
  );
  const rarest = handoffs.reduce((low, row) => (row.avg < low.avg ? row : low));
  const handoffMax = Math.max(...handoffs.map((row) => row.avg));
  const taskLabel = t.hints.task(weakestTaskId.replace(/\D/g, ""));

  return (
    <ReportSection id="collaboration" title={t.title} lede={t.lede}>
      <div className="grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-[#EFEBE2]">
        <Panel
          title={t.wait.title}
          sentence={longest ? t.wait.sentence(longest.role, longest.seconds, teamAvgWait) : null}
          first
        >
          <div className="flex flex-col gap-3">
            {roleWait.map((row) =>
              row.people < MIN_GROUP_SIZE ? (
                <HiddenRow key={row.role} label={row.role} text={copy.privacy.hidden} />
              ) : (
                <BarRow
                  key={row.role}
                  label={row.role}
                  value={t.seconds(row.seconds)}
                  pct={(row.seconds / WAIT_SCALE) * 100}
                  focus={row.role === longest?.role}
                  marker={(teamAvgWait / WAIT_SCALE) * 100}
                />
              ),
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs tabular-nums text-[#56655E]">
            <span aria-hidden className="h-3 border-l-[1.5px] border-dashed border-[#13261F]" />
            {t.wait.average(teamAvgWait)}
          </p>
        </Panel>

        <Panel title={t.handoffs.title} sentence={t.handoffs.sentence(rarest.from, rarest.to, rarest.avg)}>
          <div className="flex flex-col gap-3">
            {handoffs.map((row) => (
              <BarRow
                key={`${row.from}-${row.to}`}
                label={`${row.from} → ${row.to}`}
                labelWidth={128}
                value={String(row.avg)}
                pct={(row.avg / handoffMax) * 100}
                focus={row === rarest}
              />
            ))}
          </div>
          <p className="text-xs text-[#56655E]">{t.handoffs.unit}</p>
        </Panel>

        <Panel
          title={t.hints.title}
          sentence={t.hints.sentence(hints.onTask, hints.total, taskLabel)}
          note={excluded > 0 ? copy.privacy.excluded(excluded) : undefined}
        >
          <div aria-hidden className="flex flex-wrap gap-1.5">
            {Array.from({ length: hints.total }, (_, index) => (
              <span
                key={index}
                className={`size-5 rounded-[5px] ${
                  index < hints.onTask ? "bg-[#0F5C4A]" : "border-[1.5px] border-[#B9B2A3]"
                }`}
              />
            ))}
          </div>
          <div aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#56655E]">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-[#0F5C4A]" />
              {taskLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] border border-[#B9B2A3]" />
              {t.hints.other}
            </span>
          </div>
        </Panel>
      </div>
    </ReportSection>
  );
}

function Panel({
  title,
  sentence,
  note,
  first,
  children,
}: {
  title: string;
  sentence: string | null;
  note?: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-4 ${first ? "md:pr-8" : "md:px-8 md:last:pr-0"}`}>
      <h3 className="text-sm font-semibold text-[#13261F]">{title}</h3>
      {children}
      <div className="mt-auto pt-2">
        {sentence ? <p className="leading-snug text-[#3E4D47]">{sentence}</p> : null}
        {note ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-snug text-[#56655E]">
            <EyeOff aria-hidden size={13} className="mt-px shrink-0" />
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  pct,
  focus,
  marker,
  labelWidth = 56,
}: {
  label: string;
  value: string;
  pct: number;
  focus: boolean;
  marker?: number;
  labelWidth?: number;
}) {
  return (
    <div
      className="grid items-center gap-2 text-sm"
      style={{ gridTemplateColumns: `${labelWidth - 8}px minmax(0,1fr) 40px` }}
    >
      <span className={`whitespace-nowrap ${focus ? "font-semibold text-[#13261F]" : "text-[#3E4D47]"}`}>
        {label}
      </span>
      <span aria-hidden className="relative h-2.5">
        <span className="block h-full overflow-hidden rounded-full bg-[#F1EDE4]">
          <span
            className={`block h-full rounded-full ${focus ? "bg-[#0F5C4A]" : "bg-[#9DBDB3]"}`}
            style={{ width: `${pct}%` }}
          />
        </span>
        {marker !== undefined ? (
          <span
            className="absolute -inset-y-1.5 border-l-[1.5px] border-dashed border-[#13261F]"
            style={{ left: `${marker}%` }}
          />
        ) : null}
      </span>
      <span
        className={`text-right tabular-nums ${focus ? "font-semibold text-[#13261F]" : "text-[#3E4D47]"}`}
      >
        {value}
      </span>
    </div>
  );
}

function HiddenRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2 text-sm">
      <span className="text-[#56655E]">{label}</span>
      <span className="flex items-center gap-1.5 text-xs leading-snug text-[#56655E]">
        <EyeOff aria-hidden size={13} className="shrink-0" />
        {text}
      </span>
    </div>
  );
}
