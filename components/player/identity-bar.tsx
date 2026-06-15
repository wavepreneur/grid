"use client";

import { useRouter } from "next/navigation";
import { abandonTeamSession } from "@/lib/grid/session-recovery";
import {
  eventLobbyPath,
  eventPath,
  eventTeamJoinPath,
} from "@/lib/grid/event-routes";
import type { PlayerSession } from "@/lib/grid/types";

type IdentityBarProps = {
  inviteCode: string;
  joinCode: string;
  session: PlayerSession;
  showManageTeam?: boolean;
  showEventHome?: boolean;
};

function roleLabel(session: PlayerSession): string {
  if (session.isCaptain) return "Captain";
  if (session.isNavigator) return "GPS";
  return "Mitspieler";
}

export function IdentityBar({
  inviteCode,
  joinCode,
  session,
  showManageTeam = true,
  showEventHome = true,
}: IdentityBarProps) {
  const router = useRouter();

  function handleSwitchPlayer() {
    abandonTeamSession();
    window.location.href = eventTeamJoinPath(inviteCode, joinCode);
  }

  function handleManageTeam() {
    router.push(eventLobbyPath(inviteCode, joinCode, { manage: true }));
  }

  return (
    <div className="rounded-xl border border-[var(--grid-border)] bg-black/40 px-4 py-3 text-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[var(--grid-muted)]">
          Du bist{" "}
          <span className="font-medium text-white">{session.displayName}</span>
          <span className="ml-2 rounded-full bg-[var(--grid-accent)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--grid-accent)]">
            {roleLabel(session)}
          </span>
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          {showManageTeam ? (
            <button
              type="button"
              onClick={handleManageTeam}
              className="text-emerald-300 underline-offset-2 hover:underline"
            >
              Team verwalten
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSwitchPlayer}
            className="text-[var(--grid-accent)] underline-offset-2 hover:underline"
          >
            Das bin nicht ich
          </button>
          {showEventHome ? (
            <button
              type="button"
              onClick={() => router.push(eventPath(inviteCode))}
              className="text-[var(--grid-muted)] underline-offset-2 hover:text-white hover:underline"
            >
              Event-Start
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
