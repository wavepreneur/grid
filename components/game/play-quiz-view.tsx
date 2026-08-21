"use client";

import { useEffect, useState } from "react";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { IconCheck, IconKey, IconX } from "@/components/game/city/icons";
import type { ArrivalQuiz } from "@/lib/grid/level-types";
import { playPlaySfx } from "@/lib/grid/play-sfx";

type Props = {
  title: string;
  spotLabel: string;
  mode?: "outdoor" | "indoor" | "online";
  quiz: ArrivalQuiz;
  disabled: boolean;
  isPending: boolean;
  onSubmit: (payload: { selectedOptionId?: string; selectedOptionIds?: string[] }) => void;
};

export function PlayQuizView({
  title,
  spotLabel,
  mode = "outdoor",
  quiz,
  disabled,
  isPending,
  onSubmit,
}: Props) {
  const multi = Boolean(quiz.correct_option_ids?.length);
  const [picked, setPicked] = useState<string | null>(null);
  const [pickedMulti, setPickedMulti] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [opening, setOpening] = useState(false);

  const show = revealed;
  const correct = multi
    ? quiz.correct_option_ids!.length === pickedMulti.length &&
      quiz.correct_option_ids!.every((id) => pickedMulti.includes(id))
    : picked === quiz.correct_option_id;
  const points = Math.max(0, Math.round(quiz.points ?? 0));
  const displayTitle = quiz.title?.trim() || title;

  const heading =
    mode === "online" ? "Einstiegsfrage" : mode === "indoor" ? "Frage vor Ort" : "Umgebungsquiz";
  const intro =
    mode === "online"
      ? "Alle sehen dieselbe Frage auf ihrem eigenen Bildschirm. Eine Antwort genügt — sie ist der Schlüssel zum Rätsel."
      : "Diese Frage ist euer Schlüssel. Beantwortet sie und das Rätsel öffnet sich.";
  const openLabel =
    mode === "online"
      ? "Rätsel für alle öffnen"
      : mode === "indoor"
        ? "Rätsel aufschließen"
        : "Level aufschließen";

  function isRightOption(id: string) {
    return multi
      ? Boolean(quiz.correct_option_ids?.includes(id))
      : id === quiz.correct_option_id;
  }

  function toggleMulti(id: string) {
    if (revealed) return;
    setPickedMulti((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function pickSingle(id: string) {
    if (revealed || disabled || isPending) return;
    setPicked(id);
    setRevealed(true);
  }

  function revealMulti() {
    if (revealed || pickedMulti.length === 0) return;
    setRevealed(true);
  }

  useEffect(() => {
    if (!revealed) return;
    playPlaySfx(correct ? "correct" : "wrong");
  }, [revealed, correct]);

  function openPuzzle() {
    if (opening || disabled || isPending) return;
    setOpening(true);
    playPlaySfx("unlock");
    if (multi) {
      onSubmit({ selectedOptionIds: pickedMulti, selectedOptionId: pickedMulti[0] });
    } else if (picked) {
      onSubmit({ selectedOptionId: picked });
    }
  }

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
          const isPicked = multi ? pickedMulti.includes(opt.id) : picked === opt.id;
          const isRight = isRightOption(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={show || disabled || isPending}
              onClick={() => {
                if (multi) toggleMulti(opt.id);
                else pickSingle(opt.id);
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
            disabled={disabled || isPending || pickedMulti.length === 0}
            onClick={revealMulti}
          >
            Antworten prüfen
          </BigButton>
        </div>
      ) : null}

      {show ? (
        <div
          className={`mt-6 space-y-4 ${correct ? "cg-animate-rise-in" : "cg-animate-shake"}`}
        >
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

          <BigButton variant="accent" disabled={disabled || isPending || opening} onClick={openPuzzle}>
            {opening || isPending ? "Rätsel wird geöffnet…" : openLabel}
          </BigButton>
        </div>
      ) : null}
    </section>
  );
}
