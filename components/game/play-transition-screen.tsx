"use client";

import { useEffect, useRef } from "react";
import { IconGift, IconKey, IconUser, IconUsers } from "@/components/game/city/icons";
import { SectionLabel } from "@/components/game/city/ui";
import { playPlaySfx } from "@/lib/grid/play-sfx";

type Kind = "unlock" | "bonus";

type Props = {
  kind: Kind;
  title: string;
  subtitle?: string;
  /** Shown under the title — e.g. ORGANIZER or Ganzes Team. */
  highlight?: string;
  /** 1 = solo role, 2 = two roles, 3 = whole team. */
  audienceIcons?: 1 | 2 | 3;
  /** Auto-continue after ms (unlock). Omit for manual-only. */
  autoMs?: number;
  onDone: () => void;
};

/**
 * Lightweight interstitial between quiz→level or before a bonus task.
 * CSS-only motion + one SFX — cheap for thousands of concurrent phones.
 */
export function PlayTransitionScreen({
  kind,
  title,
  subtitle,
  highlight,
  audienceIcons = 1,
  autoMs,
  onDone,
}: Props) {
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    playPlaySfx(kind === "bonus" ? "bonus" : "unlock");
  }, [kind]);

  useEffect(() => {
    if (!autoMs || autoMs <= 0) return;
    const timer = window.setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current();
    }, autoMs);
    return () => window.clearTimeout(timer);
  }, [autoMs]);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  return (
    <section
      className="flex min-h-[70vh] flex-col items-center justify-center px-6 pb-10 pt-8 text-center"
      role="status"
      aria-live="polite"
    >
      <span
        className={`flex h-24 w-24 items-center justify-center rounded-[1.75rem] shadow-[var(--cg-shadow-lift)] ${
          kind === "unlock"
            ? "cg-animate-key-turn bg-[var(--cg-accent)] text-[var(--cg-accent-fg)]"
            : "cg-animate-bonus-gift bg-[var(--cg-primary)] text-[var(--cg-primary-fg)]"
        }`}
      >
        {kind === "unlock" ? <IconKey size={44} /> : <IconGift size={44} />}
      </span>

      <SectionLabel>{kind === "unlock" ? "Schlüssel passt" : "Bonus steht bereit"}</SectionLabel>
      <h1 className="cg-animate-rise-in mt-2 max-w-sm text-2xl font-bold text-[var(--cg-fg)]">
        {title}
      </h1>

      {highlight ? (
        <p
          className={`${
            kind === "bonus" ? "cg-animate-score-pop" : "cg-animate-pop-in"
          } mt-4 text-xl font-extrabold uppercase tracking-[0.12em] text-[var(--cg-primary)]`}
        >
          {highlight}
        </p>
      ) : null}

      <AudienceIcons count={audienceIcons} />

      {subtitle ? (
        <p className="mt-4 max-w-sm text-base text-[var(--cg-muted)]">{subtitle}</p>
      ) : null}

      {autoMs ? (
        <div className="mt-10 w-full max-w-sm space-y-3">
          <p className="text-sm font-medium text-[var(--cg-muted)]">
            {kind === "unlock"
              ? "Hauptaufgabe wird geladen…"
              : "Bonusaufgabe wird geladen…"}
          </p>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--cg-secondary)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={
              kind === "unlock" ? "Lädt die Hauptaufgabe" : "Lädt die Bonusaufgabe"
            }
          >
            <div
              className="cg-animate-progress-fill h-full rounded-full bg-[var(--cg-primary)]"
              style={{ animationDuration: `${autoMs}ms` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={finish}
          className="cg-tap-lift mt-10 w-full max-w-sm rounded-2xl bg-[var(--cg-primary)] px-5 py-4 text-base font-bold text-[var(--cg-primary-fg)] shadow-[var(--cg-shadow-lift)]"
        >
          {kind === "unlock" ? "Zur Aufgabe" : "Bereit — Bonus starten"}
        </button>
      )}
    </section>
  );
}

function AudienceIcons({ count }: { count: 1 | 2 | 3 }) {
  if (count >= 3) {
    return (
      <div className="mt-5 flex items-center justify-center gap-2 text-[var(--cg-primary)]">
        <IconUsers size={28} />
        <IconUser size={22} />
        <IconUser size={22} />
      </div>
    );
  }
  if (count === 2) {
    return (
      <div className="mt-5 flex items-center justify-center gap-2 text-[var(--cg-primary)]">
        <IconUser size={26} />
        <IconUser size={26} />
      </div>
    );
  }
  return (
    <div className="mt-5 flex items-center justify-center text-[var(--cg-primary)]">
      <IconUser size={28} />
    </div>
  );
}
