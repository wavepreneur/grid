"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getPlayerResumeToken } from "@/app/actions/lobby";
import { abandonTeamSession } from "@/lib/grid/session-recovery";
import {
  eventLobbyPath,
  eventPath,
  eventTeamJoinPath,
} from "@/lib/grid/event-routes";
import { buildPlayUrlWithResume } from "@/lib/grid/play-url";
import type { PlayerSession } from "@/lib/grid/types";

type IdentityBarProps = {
  inviteCode: string;
  joinCode: string;
  session: PlayerSession;
  showManageTeam?: boolean;
  showEventHome?: boolean;
  showCopyPlayLink?: boolean;
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
  showCopyPlayLink = false,
}: IdentityBarProps) {
  const router = useRouter();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [, startCopyTransition] = useTransition();

  function handleSwitchPlayer() {
    abandonTeamSession();
    window.location.href = eventTeamJoinPath(inviteCode, joinCode);
  }

  function handleManageTeam() {
    router.push(eventLobbyPath(inviteCode, joinCode, { manage: true }));
  }

  function handleCopyPlayLink() {
    startCopyTransition(async () => {
      const result = await getPlayerResumeToken({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
      });

      if (!result.success) {
        setCopyState("error");
        return;
      }

      const path = buildPlayUrlWithResume(inviteCode, joinCode, result.data.resumeToken);
      const url = `${window.location.origin}${path}`;

      try {
        await navigator.clipboard.writeText(url);
        setCopyState("copied");
        window.setTimeout(() => setCopyState("idle"), 2500);
      } catch {
        setCopyState("error");
      }
    });
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
          {showCopyPlayLink ? (
            <button
              type="button"
              onClick={handleCopyPlayLink}
              className="text-emerald-300 underline-offset-2 hover:underline"
            >
              {copyState === "copied"
                ? "Link kopiert"
                : copyState === "error"
                  ? "Kopieren fehlgeschlagen"
                  : "Spieler-Link kopieren"}
            </button>
          ) : null}
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
