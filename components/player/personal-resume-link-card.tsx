"use client";

import { useState } from "react";

type Props = {
  inviteCode: string;
  joinCode: string;
  sessionId?: string;
  /** Compact row for sheets; default is a lobby callout card. */
  compact?: boolean;
};

/**
 * Re-entry via /go + team code + name. Same code for the whole team;
 * the name picks the seat (1 player or 10).
 */
export function PersonalResumeLinkCard({
  joinCode,
  compact = false,
}: Props) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const code = joinCode.trim().toUpperCase();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
    }
  }

  const label =
    copyState === "copied"
      ? "Code kopiert"
      : copyState === "error"
        ? "Kopieren fehlgeschlagen"
        : "Code kopieren";

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="tap-lift w-full rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3.5 text-left"
      >
        <span className="block text-base font-bold tracking-[0.18em] text-[var(--cg-fg)]">
          {code}
        </span>
        <span className="mt-0.5 block text-sm text-[var(--cg-muted)]">
          {copyState === "idle"
            ? "Später: /go, dieser Code, dann dein Name"
            : label}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/60 px-4 py-4">
      <p className="text-sm font-bold text-teal-950">Wieder rein</p>
      <p className="mt-1 text-xs leading-relaxed text-teal-900/80">
        Merke dir diesen Code. Später auf <span className="font-semibold">/go</span>{" "}
        eintippen, dann deinen Namen — du landest im selben Spiel, egal ob allein
        oder zu zehnt.
      </p>
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
