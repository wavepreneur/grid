"use client";

import { IconUsers } from "@/components/game/city/icons";

type Member = {
  id: string;
  name: string;
  roleLabel: string;
  online?: boolean;
  isMe?: boolean;
};

type Props = {
  teamName: string;
  meName: string;
  meRoleLabel: string;
  roster?: Member[];
  compact?: boolean;
};

export function CityTeamBar({
  teamName,
  meName,
  meRoleLabel,
  roster = [],
  compact = false,
}: Props) {
  return (
    <div className="rounded-2xl bg-[var(--cg-secondary)] px-3 py-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconUsers size={16} className="text-[var(--cg-primary)]" />
          <span className="truncate text-sm font-bold text-[var(--cg-fg)]">{teamName}</span>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--cg-primary)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--cg-primary-fg)]">
          Du: {meName} · {meRoleLabel}
        </span>
      </div>

      {!compact && roster.length > 0 ? (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {roster.map((m) => (
            <span
              key={m.id}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                m.isMe
                  ? "bg-[var(--cg-card)] text-[var(--cg-fg)] shadow-[var(--cg-shadow-soft)]"
                  : "text-[var(--cg-muted)]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  m.online !== false ? "bg-[var(--cg-success)]" : "bg-[var(--cg-muted)]"
                }`}
              />
              {m.name}
              <span className="opacity-70">{m.roleLabel}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
