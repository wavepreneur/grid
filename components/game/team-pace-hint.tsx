"use client";

type Props = {
  canPaceTeam: boolean;
  leadLabel: string;
};

/** Shown instead of a continue CTA when only the team lead may advance. */
export function TeamPaceHint({ canPaceTeam, leadLabel }: Props) {
  if (canPaceTeam) return null;
  return (
    <p className="text-center text-sm font-medium leading-relaxed text-[var(--cg-muted)]">
      {leadLabel} klickt weiter, wenn ihr alles gelesen habt.
    </p>
  );
}
