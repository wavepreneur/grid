"use client";

import { IconClock, IconFlag, IconStar } from "@/components/game/city/icons";
import type { ContentMode } from "@/lib/cms/layer-model";

type Props = {
  mode: ContentMode;
  remaining: number;
  timeLabel: string;
  score: number;
};

export function CityStatusHud({ mode, remaining, timeLabel, score }: Props) {
  const label =
    mode === "indoor" ? "Stationen übrig" : mode === "online" ? "Missionen übrig" : "Level übrig";

  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[var(--cg-card)] p-2 shadow-[var(--cg-shadow-soft)]">
      <Stat icon={<IconFlag size={20} />} value={`${remaining}`} label={label} />
      <Stat icon={<IconClock size={20} />} value={timeLabel} label="Zeit" />
      <Stat icon={<IconStar size={20} />} value={`${score}`} label="Punkte" />
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
    <div className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl bg-[var(--cg-secondary)] px-2 py-2.5 sm:flex-row sm:justify-center sm:gap-2">
      <span className="text-[var(--cg-primary)]">{icon}</span>
      <span className="truncate text-lg font-bold leading-none text-[var(--cg-fg)]">{value}</span>
      <span className="truncate text-[11px] font-medium text-[var(--cg-muted)]">{label}</span>
    </div>
  );
}
