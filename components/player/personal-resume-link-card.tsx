"use client";

import { useState, useTransition } from "react";
import { getPlayerResumeToken } from "@/app/actions/lobby";
import { buildPlayUrlWithResume } from "@/lib/grid/play-url";

type Props = {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  /** Compact row for sheets; default is a lobby callout card. */
  compact?: boolean;
};

/**
 * Personal resume link — opens play and reclaims the same seat without typing a name.
 * Anyone with the team invite still needs the exact name OR this link.
 */
export function PersonalResumeLinkCard({
  inviteCode,
  joinCode,
  sessionId,
  compact = false,
}: Props) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function handleCopy() {
    startTransition(async () => {
      const result = await getPlayerResumeToken({
        inviteCode,
        joinCode,
        sessionId,
      });

      if (!result.success) {
        setCopyState("error");
        return;
      }

      const path = buildPlayUrlWithResume(
        inviteCode,
        joinCode,
        result.data.resumeToken,
      );
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

  const label =
    copyState === "copied"
      ? "Kopiert — speichern!"
      : copyState === "error"
        ? "Kopieren fehlgeschlagen"
        : isPending
          ? "Einen Moment…"
          : "Meinen Link kopieren";

  if (compact) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={handleCopy}
        className="tap-lift w-full rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5 text-left disabled:opacity-50"
      >
        <span className="block text-base font-bold text-[var(--cg-fg)]">{label}</span>
        <span className="mt-0.5 block text-sm text-[var(--cg-muted)]">
          Persönlicher Weiterspiel-Link — ohne Namenseingabe, 14 Tage gültig
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/60 px-4 py-4">
      <p className="text-sm font-bold text-teal-950">Dein Weiterspiel-Link</p>
      <p className="mt-1 text-xs leading-relaxed text-teal-900/80">
        Speichere ihn (Notizen / Home-Bildschirm). Bei leerem Akku öffnest du ihn — ohne
        Namen tippen.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={handleCopy}
        className="mt-3 w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {label}
      </button>
    </div>
  );
}
