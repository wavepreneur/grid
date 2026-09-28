"use client";

import { useState } from "react";
import { ClipboardCopy, Smartphone, StickyNote } from "lucide-react";
import { copyGoReturnSnippet } from "@/lib/grid/play-url";
import { playUi } from "@/lib/grid/play-ui";

type Props = {
  inviteCode: string;
  joinCode: string;
  sessionId?: string;
  /** Compact row for sheets; default is a lobby callout card. */
  compact?: boolean;
  language?: string | null;
};

/**
 * Re-entry via /go + team code + name. Same code for the whole team;
 * the name picks the seat (1 player or 10).
 */
export function PersonalResumeLinkCard({
  joinCode,
  compact = false,
  language,
}: Props) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const code = joinCode.trim().toUpperCase();
  const t = playUi(language);

  async function handleCopy() {
    try {
      await copyGoReturnSnippet(window.location.origin, code);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
    }
  }

  const label =
    copyState === "copied"
      ? t.resume.copyDone
      : copyState === "error"
        ? t.resume.copyFail
        : t.resume.copyIdle;

  if (compact) {
    return (
      <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--cg-fg)]">
          <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
          {t.resume.compactTitle}
        </p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-[0.18em] text-[var(--cg-fg)]">
          {code}
        </p>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="tap-lift mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--cg-primary)] px-4 py-2.5 text-sm font-bold text-[var(--cg-primary-fg)]"
        >
          <ClipboardCopy className="h-4 w-4" aria-hidden />
          {label}
        </button>
        <p className="mt-2 text-sm leading-snug text-[var(--cg-muted)]">
          {t.resume.compactHint}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/60 px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
          <Smartphone className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-teal-950">{t.resume.lobbyTitle}</p>
          <p className="mt-0.5 text-xs leading-snug text-teal-900/80">
            {t.resume.lobbyHint}
          </p>
        </div>
      </div>

      <ol className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        <li className="rounded-xl bg-white/80 px-1.5 py-2">
          <ClipboardCopy className="mx-auto h-4 w-4 text-teal-700" aria-hidden />
          <span className="mt-1 block text-[10px] font-semibold leading-tight text-teal-950">
            {t.resume.stepTap}
          </span>
        </li>
        <li className="rounded-xl bg-white/80 px-1.5 py-2">
          <StickyNote className="mx-auto h-4 w-4 text-teal-700" aria-hidden />
          <span className="mt-1 block text-[10px] font-semibold leading-tight text-teal-950">
            {t.resume.stepSave}
          </span>
        </li>
        <li className="rounded-xl bg-white/80 px-1.5 py-2">
          <Smartphone className="mx-auto h-4 w-4 text-teal-700" aria-hidden />
          <span className="mt-1 block text-[10px] font-semibold leading-tight text-teal-950">
            {t.resume.stepDone}
          </span>
        </li>
      </ol>

      <p className="mt-3 text-center font-mono text-2xl font-bold tracking-[0.22em] text-teal-950">
        {code}
      </p>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-3 w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white"
      >
        {label}
      </button>
    </div>
  );
}
