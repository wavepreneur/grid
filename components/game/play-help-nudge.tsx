"use client";

import { useEffect, useState } from "react";
import { PLAY_HELP_FAIL_HINT_AT, PLAY_HELP_IDLE_MS } from "@/lib/grid/play-help";
import type { SolveFeedbackState } from "@/components/game/solve-feedback-banner";

type Props = {
  feedback?: SolveFeedbackState | null;
  hasUnusedHint: boolean;
  canSkip: boolean;
  paused?: boolean;
  onOpenHelp: () => void;
  onOpenFaq: () => void;
};

type Track = {
  seenId: number | null;
  fails: number;
  dismissed: boolean;
  idle: boolean;
};

/**
 * Soft in-app support when humans stall — not a new FSM step.
 * Points at tip tiles, skip/reveal, FAQ. Dismissible.
 * Remount with a per-level `key` so counters reset per Aufgabe.
 */
export function PlayHelpNudge({
  feedback,
  hasUnusedHint,
  canSkip,
  paused = false,
  onOpenHelp,
  onOpenFaq,
}: Props) {
  const [track, setTrack] = useState<Track>({
    seenId: null,
    fails: 0,
    dismissed: false,
    idle: false,
  });

  if (feedback && feedback.id !== track.seenId) {
    if (feedback.kind === "wrong") {
      setTrack({
        seenId: feedback.id,
        fails: track.fails + 1,
        dismissed: false,
        idle: false,
      });
    } else {
      setTrack({
        seenId: feedback.id,
        fails: 0,
        dismissed: true,
        idle: false,
      });
    }
  }

  useEffect(() => {
    if (paused || track.dismissed) return;
    const id = window.setTimeout(() => {
      setTrack((current) => ({ ...current, idle: true }));
    }, PLAY_HELP_IDLE_MS);
    return () => window.clearTimeout(id);
  }, [track.fails, track.seenId, paused, track.dismissed]);

  const showFails = track.fails >= PLAY_HELP_FAIL_HINT_AT;
  if (track.dismissed || (!track.idle && !showFails)) return null;

  const title = showFails ? "Noch nicht die Lösung" : "Lange keine Eingabe";
  const body = hasUnusedHint
    ? "Ihr könnt einen Tipp auf einer Kachel freischalten — das kostet Punkte, bringt euch aber weiter."
    : canSkip
      ? "Kein Tipp hinterlegt. Die Team-Leitung kann die Aufgabe unten freischalten (Lösung anzeigen, 0 Punkte)."
      : "Schaut ins FAQ, oder wählt kurz, was hakt — dann gibt es den passenden Hebel.";

  return (
    <div className="mx-4 mb-3 rounded-2xl bg-[var(--cg-primary)]/12 px-4 py-3.5 ring-1 ring-[var(--cg-primary)]/25">
      <p className="text-sm font-bold text-[var(--cg-fg)]">{title}</p>
      <p className="mt-1 text-sm leading-snug text-[var(--cg-muted)]">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenHelp}
          className="tap-lift rounded-full bg-[var(--cg-primary)] px-3 py-1.5 text-xs font-bold text-[var(--cg-primary-fg)]"
        >
          Was ist los?
        </button>
        <button
          type="button"
          onClick={onOpenFaq}
          className="tap-lift rounded-full bg-[var(--cg-card)] px-3 py-1.5 text-xs font-bold text-[var(--cg-fg)]"
        >
          FAQ
        </button>
        <button
          type="button"
          onClick={() => setTrack((current) => ({ ...current, dismissed: true, idle: false }))}
          className="tap-lift rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--cg-muted)]"
        >
          Weiter rätseln
        </button>
      </div>
    </div>
  );
}
