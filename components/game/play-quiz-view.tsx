"use client";

import { useState } from "react";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { IconCheck, IconKey, IconX } from "@/components/game/city/icons";
import type { ArrivalQuiz } from "@/lib/grid/level-types";

type Props = {
  title: string;
  spotLabel: string;
  quiz: ArrivalQuiz;
  disabled: boolean;
  isPending: boolean;
  onSubmit: (payload: { selectedOptionId?: string; selectedOptionIds?: string[] }) => void;
};

export function PlayQuizView({
  title,
  spotLabel,
  quiz,
  disabled,
  isPending,
  onSubmit,
}: Props) {
  const multi = Boolean(quiz.correct_option_ids?.length);
  const [picked, setPicked] = useState<string | null>(null);
  const [pickedMulti, setPickedMulti] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const show = submitted;
  const correct = multi
    ? quiz.correct_option_ids!.length === pickedMulti.length &&
      quiz.correct_option_ids!.every((id) => pickedMulti.includes(id))
    : picked === quiz.correct_option_id;

  function toggleMulti(id: string) {
    setPickedMulti((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit() {
    if (submitted) return;
    setSubmitted(true);
    if (multi) {
      onSubmit({ selectedOptionIds: pickedMulti, selectedOptionId: pickedMulti[0] });
    } else if (picked) {
      onSubmit({ selectedOptionId: picked });
    }
  }

  return (
    <section className="flex flex-col px-5 pb-8 pt-6">
      <div className="mt-4 flex flex-col items-center text-center">
        <span className="cg-animate-key-turn flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--cg-accent)] text-[var(--cg-accent-fg)] shadow-[var(--cg-shadow-lift)]">
          <IconKey size={40} />
        </span>
        <SectionLabel>{spotLabel}</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold text-[var(--cg-fg)]">
          {multi ? "Quiz" : "Umgebungsquiz"}
        </h1>
        <p className="mt-2 max-w-md text-base text-[var(--cg-muted)]">
          {multi
            ? "Wählt alle richtigen Antworten — danach öffnet sich das Rätsel."
            : "Diese Frage ist euer Schlüssel. Beantwortet sie und das Rätsel öffnet sich."}
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--cg-fg)]">{title}</p>
      </div>

      <p className="mt-7 rounded-2xl bg-[var(--cg-card)] p-5 text-lg font-semibold shadow-[var(--cg-shadow-soft)] text-[var(--cg-fg)]">
        {quiz.question}
      </p>

      <div className="mt-4 grid gap-3">
        {quiz.options.map((opt) => {
          const isPicked = multi ? pickedMulti.includes(opt.id) : picked === opt.id;
          const isRight = multi
            ? Boolean(quiz.correct_option_ids?.includes(opt.id))
            : opt.id === quiz.correct_option_id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={show || disabled || isPending}
              onClick={() => {
                if (multi) toggleMulti(opt.id);
                else {
                  setPicked(opt.id);
                  setSubmitted(true);
                  onSubmit({ selectedOptionId: opt.id });
                }
              }}
              className={`cg-tap-lift grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-2 px-4 py-5 text-left text-base font-semibold ${
                show && isRight
                  ? "border-[var(--cg-success)] bg-[var(--cg-success)]/20"
                  : show && isPicked && !isRight
                    ? "border-[var(--cg-destructive)] bg-[var(--cg-destructive)]/10"
                    : isPicked
                      ? "border-[var(--cg-primary)] bg-[var(--cg-card)]"
                      : "border-[var(--cg-border)] bg-[var(--cg-card)]"
              }`}
            >
              <span>{opt.label}</span>
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
            disabled={disabled || isPending || pickedMulti.length === 0}
            onClick={submit}
          >
            Antworten prüfen
          </BigButton>
        </div>
      ) : null}

      {show && correct ? (
        <div className="cg-animate-rise-in mt-6">
          <BigButton variant="accent" disabled>
            Rätsel wird geöffnet…
          </BigButton>
        </div>
      ) : null}
    </section>
  );
}
