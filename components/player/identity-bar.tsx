"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getPlayerResumeToken } from "@/app/actions/lobby";
import { abandonTeamSession } from "@/lib/grid/session-recovery";
import {
  eventPath,
  eventTeamJoinPath,
} from "@/lib/grid/event-routes";
import { buildManageTeamUrl, buildPlayUrlWithResume } from "@/lib/grid/play-url";
import { archetypeRoleLabel } from "@/lib/grid/archetype-roles";
import { IconHome, IconUsers } from "@/components/cms/studio-icons";
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
  if (session.effectiveBeta && session.isAlpha) {
    return "Team-Leiter · Hinweise";
  }
  return archetypeRoleLabel(session.archetypeRole);
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
  const [, startTransition] = useTransition();

  function handleSwitchPlayer() {
    abandonTeamSession();
    window.location.href = eventTeamJoinPath(inviteCode, joinCode);
  }

  function handleManageTeam() {
    startTransition(async () => {
      const result = await getPlayerResumeToken({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
      });

      router.push(
        buildManageTeamUrl(
          inviteCode,
          joinCode,
          result.success ? result.data.resumeToken : undefined,
        ),
      );
    });
  }

  function handleCopyPlayLink() {
    startTransition(async () => {
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
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-600">
          Angemeldet als{" "}
          <span className="font-semibold text-slate-900">{session.displayName}</span>
          <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
            {roleLabel(session)}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {showCopyPlayLink ? (
            <button
              type="button"
              onClick={handleCopyPlayLink}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              {copyState === "copied"
                ? "✓ Kopiert"
                : copyState === "error"
                  ? "Fehler"
                  : "Link kopieren"}
            </button>
          ) : null}
          {showManageTeam ? (
            <button
              type="button"
              onClick={handleManageTeam}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <IconUsers size={12} />
              Team verwalten
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSwitchPlayer}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-teal-600 hover:bg-teal-50"
          >
            Anderer Spieler
          </button>
          {showEventHome ? (
            <button
              type="button"
              onClick={() => router.push(eventPath(inviteCode))}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              <IconHome size={12} />
              Start
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
