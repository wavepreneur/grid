"use client";

import { IconClock, IconFlag, IconStar } from "@/components/game/city/icons";
import type { ContentMode } from "@/lib/cms/layer-model";

type Props = {
  mode: ContentMode;
  /** Completed / total for a clear progress read. */
  completed: number;
  total: number;
  timeLabel: string;
  score: number;
};

export function CityStatusHud({ mode, completed, total, timeLabel, score }: Props) {
  const label =
    mode === "indoor" ? "Stationen" : mode === "online" ? "Missionen" : "Level";

  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[var(--cg-card)] p-1.5 shadow-[var(--cg-shadow-soft)] sm:gap-2 sm:p-2.5">
      <Stat icon={<IconFlag size={18} />} value={`${completed}/${total}`} label={label} />
      <Stat icon={<IconClock size={18} />} value={timeLabel} label="Zeit" />
      <Stat icon={<IconStar size={18} />} value={`${score}`} label="Punkte" />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl bg-[var(--cg-secondary)] px-1.5 py-2 sm:gap-1 sm:px-2 sm:py-3 sm:flex-row sm:justify-center">
      <span className="text-[var(--cg-primary)]">{icon}</span>
      <span className="max-w-full truncate text-sm font-bold leading-none text-[var(--cg-fg)] sm:text-base">
        {value}
      </span>
      <span className="truncate text-[10px] font-medium text-[var(--cg-muted)] sm:text-[11px]">
        {label}
      </span>
    </div>
  );
}
