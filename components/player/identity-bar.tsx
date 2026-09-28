"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getPlayerResumeToken, handoverSession } from "@/app/actions/lobby";
import { abandonTeamSession } from "@/lib/grid/session-recovery";
import {
  eventPath,
  eventTeamJoinPath,
} from "@/lib/grid/event-routes";
import { buildManageTeamUrl, copyGoReturnSnippet } from "@/lib/grid/play-url";
import { archetypeRoleLabel } from "@/lib/grid/archetype-roles";
import { clearPlayerSession } from "@/lib/grid/player-session";
import { IconHome, IconUsers } from "@/components/cms/studio-icons";
import { playUi } from "@/lib/grid/play-ui";
import type { PlayerSession } from "@/lib/grid/types";

type IdentityBarProps = {
  inviteCode: string;
  joinCode: string;
  session: PlayerSession;
  showManageTeam?: boolean;
  showEventHome?: boolean;
  showCopyPlayLink?: boolean;
  showReleaseSeat?: boolean;
  language?: string | null;
};

function roleLabel(session: PlayerSession, language?: string | null): string {
  if (session.effectiveBeta && session.isAlpha) {
    return playUi(language).lobby.leadHints;
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
  showReleaseSeat = true,
  language,
}: IdentityBarProps) {
  const t = playUi(language);
  const router = useRouter();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function handleReleaseSeat() {
    startTransition(async () => {
      await handoverSession({
        inviteCode,
        joinCode,
        sessionId: session.sessionId,
      });
      clearPlayerSession();
      abandonTeamSession();
      window.location.href = `${eventTeamJoinPath(inviteCode, joinCode)}?rejoin=1`;
    });
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
      try {
        await copyGoReturnSnippet(window.location.origin, joinCode);
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
          {t.lobby.signedInAs(session.displayName)}
          <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
            {roleLabel(session, language)}
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
                ? t.copied
                : copyState === "error"
                  ? t.resume.copyFail
                  : t.resume.copyIdle}
            </button>
          ) : null}
          {showManageTeam ? (
            <button
              type="button"
              onClick={handleManageTeam}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <IconUsers size={12} />
              {t.lobby.manageTeam}
            </button>
          ) : null}
          {showReleaseSeat ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleReleaseSeat}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-50"
            >
              {isPending ? "…" : t.lobby.releaseSeat}
            </button>
          ) : null}
          {showEventHome ? (
            <button
              type="button"
              onClick={() => router.push(eventPath(inviteCode))}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              <IconHome size={12} />
              {t.lobby.eventHome}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
