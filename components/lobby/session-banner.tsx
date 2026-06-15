"use client";

import Link from "next/link";
import { abandonTeamSession } from "@/lib/grid/session-recovery";
import type { PlayerSession } from "@/lib/grid/types";

type SessionBannerProps = {
  inviteCode: string;
  joinCode: string;
  session: PlayerSession;
  manageHref?: string;
};

function roleLabel(session: PlayerSession): string {
  if (session.isCaptain) return "Captain";
  if (session.isNavigator) return "Team Lead (GPS)";
  return "Mitspieler";
}

export function SessionBanner({
  inviteCode,
  joinCode,
  session,
  manageHref,
}: SessionBannerProps) {
  function handleSwitchPlayer() {
    abandonTeamSession();
    window.location.href = `/join/${inviteCode}?team=${joinCode}`;
  }

  return (
    <div className="rounded-xl border border-[var(--grid-border)] bg-black/30 px-4 py-3 text-sm">
      <p className="text-[var(--grid-muted)]">
        Eingeloggt als{" "}
        <span className="text-white">{session.displayName}</span>
        <span className="ml-2 text-xs uppercase tracking-[0.14em] text-[var(--grid-accent)]">
          {roleLabel(session)}
        </span>
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <button
          type="button"
          onClick={handleSwitchPlayer}
          className="text-[var(--grid-accent)] underline-offset-2 hover:underline"
        >
          Anderer Spieler / Captain
        </button>
        {manageHref ? (
          <Link
            href={manageHref}
            className="text-emerald-300 underline-offset-2 hover:underline"
          >
            Team verwalten
          </Link>
        ) : null}
      </div>
    </div>
  );
}
