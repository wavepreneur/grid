"use client";

import { useEffect, useRef, useState } from "react";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { IconCheck, IconKey, IconX } from "@/components/game/city/icons";
import type { ArrivalQuiz } from "@/lib/grid/level-types";
import type { QuizRevealState } from "@/lib/grid/game-state";
import { playPlaySfx } from "@/lib/grid/play-sfx";

const AUTO_ADVANCE_MS = 2800;

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
  /** After shared reveal, open the real task for everyone. */
  onAdvanceToLevel: () => void;
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
}: Props) {
  const multi = Boolean(quiz.correct_option_ids?.length);
  const [picked, setPicked] = useState<string | null>(null);
  const [pickedMulti, setPickedMulti] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const advancedRef = useRef(false);
  const sfxPlayedRef = useRef<string | null>(null);
  const onAdvanceRef = useRef(onAdvanceToLevel);
  onAdvanceRef.current = onAdvanceToLevel;

  const show = Boolean(teamReveal);
  const correct = teamReveal?.correct ?? false;
  const selectedIds = teamReveal?.selected_option_ids ?? [];
  const points = teamReveal?.points_earned ?? Math.max(0, Math.round(quiz.points ?? 0));
  const displayTitle = quiz.title?.trim() || title;

  const heading =
    mode === "online" ? "Einstiegsfrage" : mode === "indoor" ? "Frage vor Ort" : "Umgebungsquiz";
  const intro =
    mode === "online"
      ? "Alle sehen dieselbe Frage. Eine Antwort genügt — sie ist der Schlüssel zum Rätsel."
      : "Diese Frage ist euer Schlüssel. Eine Antwort vom Team öffnet das Rätsel für alle.";

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
    if (show || disabled || isPending || submitting) return;
    setPickedMulti((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submitSingle(id: string) {
    if (show || disabled || isPending || submitting) return;
    setPicked(id);
    setSubmitting(true);
    onSubmit({ selectedOptionId: id });
  }

  function submitMulti() {
    if (show || pickedMulti.length === 0 || disabled || isPending || submitting) return;
    setSubmitting(true);
    onSubmit({ selectedOptionIds: pickedMulti, selectedOptionId: pickedMulti[0] });
  }

  useEffect(() => {
    if (!teamReveal) {
      setSubmitting(false);
      advancedRef.current = false;
      return;
    }
    if (sfxPlayedRef.current !== teamReveal.revealed_at) {
      sfxPlayedRef.current = teamReveal.revealed_at;
      playPlaySfx(teamReveal.correct ? "correct" : "wrong");
    }
    if (advancedRef.current) return;
    const timer = window.setTimeout(() => {
      if (advancedRef.current) return;
      advancedRef.current = true;
      playPlaySfx("unlock");
      onAdvanceRef.current();
    }, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [teamReveal]);

  return (
    <section className="flex flex-col px-5 pb-8 pt-6">
      <div className="mt-2 flex flex-col items-center text-center">
        <span className="cg-animate-key-turn flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--cg-accent)] text-[var(--cg-accent-fg)] shadow-[var(--cg-shadow-lift)]">
          <IconKey size={40} />
        </span>
        <SectionLabel>{spotLabel}</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold text-[var(--cg-fg)]">{heading}</h1>
        <p className="mt-2 max-w-md text-base text-[var(--cg-muted)]">{intro}</p>
      </div>

      {quiz.image_url ? (
        <div className="cg-animate-rise-in mt-5 overflow-hidden rounded-3xl shadow-[var(--cg-shadow-soft)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={quiz.image_url}
            alt=""
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
      ) : null}

      <div className="mt-5 text-center">
        <h2 className="text-xl font-bold text-[var(--cg-fg)]">{displayTitle}</h2>
        {quiz.description?.trim() ? (
          <p className="mt-2 text-base text-[var(--cg-muted)]">{quiz.description.trim()}</p>
        ) : null}
      </div>

      <p className="mt-6 rounded-2xl bg-[var(--cg-card)] p-5 text-lg font-semibold shadow-[var(--cg-shadow-soft)] text-[var(--cg-fg)]">
        {quiz.question}
      </p>

      <div className={`mt-4 grid gap-3 ${mode === "online" ? "sm:grid-cols-2" : ""}`}>
        {quiz.options.map((opt, i) => {
          const isPicked = isSelectedOption(opt.id);
          const isRight = isRightOption(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={show || disabled || isPending || submitting}
              onClick={() => {
                if (multi) toggleMulti(opt.id);
                else submitSingle(opt.id);
              }}
              className={`cg-tap-lift grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-2 px-4 py-5 text-left text-base font-semibold ${
                show && isRight
                  ? "border-[var(--cg-success)] bg-[var(--cg-success)]/20"
                  : show && isPicked && !isRight
                    ? "border-[var(--cg-destructive)] bg-[var(--cg-destructive)]/10"
                    : isPicked
                      ? "border-[var(--cg-primary)] bg-[var(--cg-card)]"
                      : "border-[var(--cg-border)] bg-[var(--cg-card)]"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-secondary)] text-sm font-bold text-[var(--cg-fg)]">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0">{opt.label}</span>
              {show && isRight ? <IconCheck className="text-[var(--cg-success)]" /> : null}
              {show && isPicked && !isRight ? (
                <IconX className="text-[var(--cg-destructive)]" />
              ) : null}
            </button>
          );
        })}
      </div>

      {multi && !show ? (
        <div className="mt-6">
          <BigButton
            variant="accent"
            disabled={disabled || isPending || submitting || pickedMulti.length === 0}
            onClick={submitMulti}
          >
            {submitting || isPending ? "Wird geprüft…" : "Antwort fürs Team senden"}
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

          {!correct ? (
            <div className="rounded-2xl border border-[var(--cg-success)]/40 bg-[var(--cg-success)]/10 px-4 py-3 text-sm text-[var(--cg-fg)]">
              <p className="font-semibold">Richtige Antwort</p>
              <p className="mt-1">
                {quiz.options
                  .filter((o) => isRightOption(o.id))
                  .map((o) => o.label)
                  .join(" · ")}
              </p>
            </div>
          ) : null}

          {quiz.side_fact?.trim() ? (
            <div className="rounded-2xl bg-[var(--cg-secondary)] px-4 py-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cg-muted)]">
                Wusstet ihr?
              </p>
              <p className="mt-1 text-base text-[var(--cg-fg)]">{quiz.side_fact.trim()}</p>
            </div>
          ) : null}

          <p className="text-center text-sm font-medium text-[var(--cg-muted)]">
            Rätsel öffnet sich für alle…
          </p>
        </div>
      ) : null}
    </section>
  );
}
