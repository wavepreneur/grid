"use client";

import { useState } from "react";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { IconCheck, IconGift, IconUser, IconX } from "@/components/game/city/icons";
import { CityTeamBar } from "@/components/game/city/team-bar";
import type { BonusTask } from "@/lib/grid/level-types";
import { roleLabelDe } from "@/lib/grid/bonus";
import type { ContentMode } from "@/lib/cms/layer-model";
import { hubMeta } from "@/lib/grid/play-slots";

type Props = {
  bonus: BonusTask;
  mode: ContentMode;
  isMine: boolean;
  myName: string;
  myRoleLabel: string;
  teamName: string;
  waitingRoleLabel: string;
  disabled: boolean;
  isPending: boolean;
  onSubmit: (selectedOptionId: string) => void;
  onSkipWaiting: () => void;
};

export function PlayBonusView({
  bonus,
  mode,
  isMine,
  myName,
  myRoleLabel,
  teamName,
  waitingRoleLabel,
  disabled,
  isPending,
  onSubmit,
  onSkipWaiting,
}: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = picked === bonus.correct_option_id;
  const show = picked !== null;
  const hub = hubMeta(mode);

  function finish() {
    if (!picked || submitted) return;
    setSubmitted(true);
    onSubmit(picked);
  }

  if (!isMine) {
    return (
      <section className="flex flex-col gap-5 px-5 pb-8 pt-6">
        <CityTeamBar teamName={teamName} meName={myName} meRoleLabel={myRoleLabel} compact />
        <div className="mt-8 flex flex-col items-center text-center">
          <span className="cg-animate-pop-in flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--cg-accent)] text-[var(--cg-accent-fg)] shadow-[var(--cg-shadow-lift)]">
            <IconGift size={40} />
          </span>
          <SectionLabel>Bonusaufgabe läuft</SectionLabel>
          <h2 className="mt-2 text-2xl font-bold text-[var(--cg-fg)]">
            {waitingRoleLabel} ist dran
          </h2>
          <p className="mt-3 max-w-sm text-base text-[var(--cg-muted)]">
            Nur {waitingRoleLabel} sieht die Aufgabe. Danach geht es für alle weiter zur{" "}
            {hub.hubLabelDe}.
          </p>
        </div>
        <div className="mt-auto pt-8">
          <BigButton variant="ghost" disabled={disabled || isPending} onClick={onSkipWaiting}>
            Weiter ohne Bonus (Team)
          </BigButton>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[70vh] flex-col px-5 pb-8 pt-6">
      <CityTeamBar teamName={teamName} meName={myName} meRoleLabel={myRoleLabel} compact />

      <div className="mt-6 flex flex-col items-center text-center">
        <span className="cg-animate-pop-in flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--cg-accent)] text-[var(--cg-accent-fg)] shadow-[var(--cg-shadow-lift)]">
          <IconGift size={40} />
        </span>
        <SectionLabel>Bonusaufgabe · +{bonus.reward} Punkte</SectionLabel>
        <h1 className="mt-1 text-2xl font-bold text-[var(--cg-fg)]">{bonus.title}</h1>
      </div>

      <div className="mt-6 flex justify-center">
        <span className="flex items-center gap-1.5 rounded-full bg-[var(--cg-primary)] px-3 py-2 text-sm font-bold text-[var(--cg-primary-fg)]">
          <IconUser size={16} /> {myName}
          <span className="opacity-70">{roleLabelDe(bonus.for_role)}</span>
        </span>
      </div>

      <div className="cg-animate-rise-in mt-8 space-y-4">
        <p className="rounded-2xl bg-[var(--cg-accent)]/15 px-4 py-3 text-center text-base font-semibold text-[var(--cg-fg)]">
          {bonus.intro ?? `Nur du siehst diese Aufgabe, ${myName}.`}
        </p>
        <p className="rounded-2xl bg-[var(--cg-card)] p-5 text-lg font-semibold shadow-[var(--cg-shadow-soft)] text-[var(--cg-fg)]">
          {bonus.question}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {bonus.options.map((opt) => {
            const isPicked = picked === opt.id;
            const isRight = opt.id === bonus.correct_option_id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={show || disabled || isPending || submitted}
                onClick={() => setPicked(opt.id)}
                className={`cg-tap-lift flex items-center justify-center gap-2 rounded-2xl border-2 py-6 text-xl font-bold ${
                  show && isRight
                    ? "border-[var(--cg-success)] bg-[var(--cg-success)]/20"
                    : show && isPicked
                      ? "border-[var(--cg-destructive)] bg-[var(--cg-destructive)]/10"
                      : "border-[var(--cg-border)] bg-[var(--cg-card)]"
                }`}
              >
                {opt.label}
                {show && isRight ? <IconCheck className="text-[var(--cg-success)]" /> : null}
                {show && isPicked && !isRight ? (
                  <IconX className="text-[var(--cg-destructive)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-6">
        {show ? (
          <div className="cg-animate-rise-in space-y-3">
            <p className="text-center text-base font-semibold text-[var(--cg-fg)]">
              {correct
                ? `Richtig! +${bonus.reward} Punkte für das Team.`
                : "Diesmal daneben — keine Punkte, es geht direkt weiter."}
            </p>
            <BigButton disabled={isPending || submitted} onClick={finish}>
              Zurück zur {hub.hubLabelDe}
            </BigButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}
