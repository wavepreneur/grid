"use client";

import { useEffect, useRef, useState } from "react";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { IconCheck, IconKey, IconX } from "@/components/game/city/icons";
import type { ArrivalQuiz } from "@/lib/grid/level-types";
import type { QuizRevealState } from "@/lib/grid/game-state";
import { playPlaySfx } from "@/lib/grid/play-sfx";
import { FormattedTaskText } from "@/components/game/formatted-task-text";
import { TeamPaceHint } from "@/components/game/team-pace-hint";

type Props = {
  title: string;
  spotLabel: string;
  mode?: "outdoor" | "indoor" | "online";
  quiz: ArrivalQuiz;
  disabled: boolean;
  isPending: boolean;
  /** Shared team reveal from game_state — drives every device. */
  teamReveal?: QuizRevealState | null;
  onSubmit: (payload: { selectedOptionId?: string; selectedOptionIds?: string[] }) => void;
  /** After shared reveal, open the unlock transition for everyone. */
  onAdvanceToLevel: () => void;
  canPaceTeam?: boolean;
  leadLabel?: string;
};

export function PlayQuizView({
  title,
  spotLabel,
  mode = "outdoor",
  quiz,
  disabled,
  isPending,
  teamReveal = null,
  onSubmit,
  onAdvanceToLevel,
  canPaceTeam = false,
  leadLabel = "Team Lead",
}: Props) {
  const multi = Boolean(quiz.correct_option_ids?.length);
  const [picked, setPicked] = useState<string | null>(null);
  const [pickedMulti, setPickedMulti] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const sfxPlayedRef = useRef<string | null>(null);

  const show = Boolean(teamReveal);
  const correct = teamReveal?.correct ?? false;
  const selectedIds = teamReveal?.selected_option_ids ?? [];
  const points = teamReveal?.points_earned ?? Math.max(0, Math.round(quiz.points ?? 0));
  const displayTitle = quiz.title?.trim() || title;

  const heading =
    mode === "online" ? "Einstiegsfrage" : mode === "indoor" ? "Frage vor Ort" : "Umgebungsquiz";
  const intro =
    mode === "online"
      ? "Eine Antwort genügt — sie öffnet das Rätsel für alle."
      : "Eine Antwort vom Team öffnet das Rätsel für alle.";

  function isRightOption(id: string) {
    return multi
      ? Boolean(quiz.correct_option_ids?.includes(id))
      : id === quiz.correct_option_id;
  }

  function isSelectedOption(id: string) {
    if (show) return selectedIds.includes(id);
    return multi ? pickedMulti.includes(id) : picked === id;
  }

  function toggleMulti(id: string) {
    if (show || disabled || submitting) return;
    setPickedMulti((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submitSingle(id: string) {
    if (show || disabled || submitting) return;
    setPicked(id);
    setSubmitting(true);
    onSubmit({ selectedOptionId: id });
  }

  function submitMulti() {
    if (show || pickedMulti.length === 0 || disabled || submitting) return;
    setSubmitting(true);
    onSubmit({ selectedOptionIds: pickedMulti, selectedOptionId: pickedMulti[0] });
  }

  useEffect(() => {
    if (!teamReveal) {
      setSubmitting(false);
      setAdvancing(false);
      return;
    }
    if (sfxPlayedRef.current !== teamReveal.revealed_at) {
      sfxPlayedRef.current = teamReveal.revealed_at;
      playPlaySfx(teamReveal.correct ? "correct" : "wrong");
    }
  }, [teamReveal]);

  function handleAdvance() {
    if (advancing || disabled || isPending || !canPaceTeam) return;
    setAdvancing(true);
    onAdvanceToLevel();
  }

  const openLabel =
    mode === "online" ? "Level für alle aufschließen" : "Level aufschließen";

  return (
    <section className="mx-auto flex w-full max-w-md flex-col px-4 pb-[max(2rem,calc(1rem+env(safe-area-inset-bottom)))] pt-4 sm:px-5">
      <article className="overflow-hidden rounded-[1.75rem] bg-[var(--cg-card)] shadow-[var(--cg-shadow-soft)]">
        <header className="bg-[var(--cg-accent)]/14 px-4 pb-4 pt-4 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="cg-animate-key-turn flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--cg-accent)] text-[var(--cg-accent-fg)] shadow-[var(--cg-shadow-lift)]">
              <IconKey size={26} />
            </span>
            <div className="min-w-0 text-left">
              <SectionLabel>{spotLabel}</SectionLabel>
              <h1 className="mt-0.5 text-lg font-bold leading-tight text-[var(--cg-fg)] sm:text-xl">
                {heading}
              </h1>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2.5 rounded-2xl bg-[var(--cg-card)] px-3 py-2.5 text-[13px] leading-snug text-[var(--cg-fg)]/80 sm:text-sm">
            <span className="mt-px shrink-0 rounded-full bg-[var(--cg-accent)]/22 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--cg-fg)]">
              Schlüssel
            </span>
            <span>{intro}</span>
          </p>
        </header>

        {quiz.image_url ? (
          <div className="cg-animate-rise-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={quiz.image_url}
              alt=""
              className="aspect-[16/10] max-h-[min(28vh,14rem)] w-full object-cover object-center"
            />
          </div>
        ) : null}

        <div className="px-4 pb-5 pt-5 sm:px-5">
          <div>
            <h2 className="text-xl font-extrabold leading-snug text-[var(--cg-fg)] sm:text-2xl">
              {displayTitle}
            </h2>
            {quiz.description?.trim() ? (
              <FormattedTaskText
                text={quiz.description}
                className="mt-3 space-y-3 text-[15px] leading-[1.65] text-[var(--cg-fg)] sm:text-base"
              />
            ) : null}
          </div>

          <p className="mt-5 border-l-4 border-[var(--cg-accent)] pl-3 text-lg font-bold leading-snug text-[var(--cg-fg)] sm:text-xl">
            {quiz.question}
          </p>

          <div className="mt-3 grid gap-2.5">
        {quiz.options.map((opt, i) => {
          const isPicked = isSelectedOption(opt.id);
          const isRight = isRightOption(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={show || disabled || submitting}
              onClick={() => {
                if (multi) toggleMulti(opt.id);
                else submitSingle(opt.id);
              }}
              className={`cg-tap-lift grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-2 px-3 py-4 text-left text-sm font-semibold sm:px-4 sm:py-5 sm:text-base ${
                show && isRight
                  ? "border-[var(--cg-success)] bg-[var(--cg-success)]/20"
                  : show && isPicked && !isRight
                    ? "border-[var(--cg-destructive)] bg-[var(--cg-destructive)]/10"
                    : isPicked
                      ? "border-[var(--cg-primary)] bg-[var(--cg-primary)]/18 ring-2 ring-[var(--cg-primary)]/40"
                      : "border-[var(--cg-border)] bg-[var(--cg-bg)]"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold sm:h-9 sm:w-9 ${
                  show && isRight
                    ? "bg-[var(--cg-success)] text-white"
                    : isPicked && !show
                      ? "bg-[var(--cg-primary)] text-[var(--cg-primary-fg)]"
                      : "bg-[var(--cg-secondary)] text-[var(--cg-fg)]"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{opt.label}</span>
              {show && isRight ? <IconCheck className="text-[var(--cg-success)]" /> : null}
              {show && isPicked && !isRight ? (
                <IconX className="text-[var(--cg-destructive)]" />
              ) : null}
              {!show && isPicked ? (
                <IconCheck className="text-[var(--cg-primary)]" />
              ) : null}
            </button>
          );
        })}
      </div>

          {multi && !show ? (
            <div className="mt-6">
              <BigButton
                variant="accent"
                disabled={disabled || submitting || pickedMulti.length === 0}
                onClick={submitMulti}
              >
                {submitting ? "Wird geprüft…" : "Antwort fürs Team senden"}
              </BigButton>
            </div>
          ) : null}

          {show && teamReveal ? (
            <div
              className={`mt-6 space-y-4 ${correct ? "cg-animate-rise-in" : "cg-animate-shake"}`}
            >
          <p className="text-center text-sm font-semibold text-[var(--cg-muted)]">
            Antwort von <span className="text-[var(--cg-fg)]">{teamReveal.answered_by}</span>
          </p>
          {!correct && selectedIds.length > 0 ? (
            <p className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-[var(--cg-fg)]">
              <span className="text-[var(--cg-muted)]">Gewählt</span>
              {quiz.options.map((opt, i) => {
                if (!selectedIds.includes(opt.id)) return null;
                const right = isRightOption(opt.id);
                return (
                  <span
                    key={opt.id}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-bold ${
                      right
                        ? "bg-[var(--cg-success)]/20 text-[var(--cg-success)]"
                        : "bg-[var(--cg-destructive)]/15 text-[var(--cg-destructive)]"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                );
              })}
            </p>
          ) : null}
          <p
            className={`text-center text-base font-semibold ${
              correct ? "text-[var(--cg-success)]" : "text-[var(--cg-destructive)]"
            }`}
          >
            {correct
              ? points > 0
                ? `Richtig! +${points} Punkte — der Schlüssel passt.`
                : "Richtig! Der Schlüssel passt."
              : "Leider falsch — der Schlüssel passt trotzdem, aber ohne Bonuspunkte."}
          </p>

          {quiz.side_fact?.trim() ? (
            <div className="rounded-2xl bg-[var(--cg-secondary)] px-4 py-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cg-muted)]">
                Wusstet ihr?
              </p>
              <p className="mt-1 text-base text-[var(--cg-fg)]">{quiz.side_fact.trim()}</p>
            </div>
          ) : null}

          {canPaceTeam ? (
            <BigButton
              variant="accent"
              icon={<IconKey size={20} />}
              disabled={disabled || isPending || advancing}
              onClick={handleAdvance}
            >
              {advancing || isPending ? "Schließt auf…" : openLabel}
            </BigButton>
          ) : (
            <TeamPaceHint canPaceTeam={false} leadLabel={leadLabel} />
          )}
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
