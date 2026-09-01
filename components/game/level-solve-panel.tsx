"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import {
  GridButton,
  GridHint,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";
import { BigButton, SectionLabel } from "@/components/game/city/ui";
import { LevelTaskCard } from "@/components/game/city/level-screen-blocks";
import { RevealSolutionControl } from "@/components/game/reveal-solution-control";
import {
  SolveFeedbackBanner,
  type SolveFeedbackState,
} from "@/components/game/solve-feedback-banner";
import { IconCheck, IconMapPin } from "@/components/cms/studio-icons";
import { distanceMeters, formatDistance, isWithinGeofenceForPlay } from "@/lib/grid/geofence";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { useLevelScoringTimer } from "@/lib/hooks/use-level-scoring-timer";
import { LevelScoringBar } from "@/components/game/level-scoring-bar";
import { CodeBoxesInput } from "@/components/game/code-boxes-input";
import { hasLiveLevelScoring } from "@/lib/grid/level-scoring";
import { formatLevelSolution } from "@/lib/grid/level-solution";
import type { LevelDefinition, SolveLevelPayload } from "@/lib/grid/level-types";
import type { LevelRevealState } from "@/lib/grid/game-state";
import { TeamPaceHint } from "@/components/game/team-pace-hint";

type LevelSolvePanelProps = {
  level: LevelDefinition;
  disabled: boolean;
  isPending: boolean;
  isNavigator: boolean;
  levelStartedAt?: string | null;
  fallbackStartedAt?: string | null;
  onSubmit: (payload: SolveLevelPayload) => void;
  hideGpsStatus?: boolean;
  autoSubmitGps?: boolean;
  /** City-Game Look — gleiche Karte wie Studio-Vorschau. */
  cityStyle?: boolean;
  /** Scoring wird außerhalb gerendert (HUD unter dem Titel). */
  hideScoring?: boolean;
  /** Wrong / correct burst after submit. */
  feedback?: SolveFeedbackState | null;
  teamReveal?: LevelRevealState | null;
  canPaceTeam?: boolean;
  leadLabel?: string;
  onReveal?: () => void;
};

export function LevelSolvePanel({
  level,
  disabled,
  isPending,
  isNavigator,
  levelStartedAt,
  fallbackStartedAt,
  onSubmit,
  hideGpsStatus = false,
  autoSubmitGps = true,
  cityStyle = false,
  hideScoring = false,
  feedback = null,
  teamReveal = null,
  canPaceTeam = false,
  leadLabel = "Team Lead",
  onReveal,
}: LevelSolvePanelProps) {
  const [answer, setAnswer] = useState("");
  const [numberParts, setNumberParts] = useState<string[]>(() =>
    Array.from({ length: level.number_fields ?? 1 }, () => ""),
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [solutionRevealed, setSolutionRevealed] = useState(false);
  const [codeFocusToken, setCodeFocusToken] = useState<number | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const revealSubmittedRef = useRef(false);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  const allowReveal = Boolean(level.scoring?.allow_reveal_solution);
  const scoringSnapshot = useLevelScoringTimer(
    level.scoring,
    levelStartedAt,
    fallbackStartedAt,
  );

  const gpsEnabled = level.type === "gps" && Boolean(level.location) && isNavigator;
  const { sample, error: gpsError, isLoading: gpsLoading } = useGeolocation(gpsEnabled);

  const distance =
    sample && level.location ? distanceMeters(sample, level.location) : null;

  const withinRadius =
    sample && level.location ? isWithinGeofenceForPlay(sample, level.location) : false;

  const inputMode = level.input_mode ?? "text";
  const isCodeBoxes = inputMode === "boxes" || inputMode === "number";
  const numberFieldCount = level.number_fields ?? 1;
  const solutionText = formatLevelSolution(level);
  const solutionShown = solutionRevealed || Boolean(teamReveal);

  useEffect(() => {
    setAutoTriggered(false);
    setAnswer("");
    setNumberParts(Array.from({ length: level.number_fields ?? 1 }, () => ""));
    setSelectedOptionId(null);
    setSelectedOptionIds([]);
    setSolutionRevealed(false);
    revealSubmittedRef.current = false;
  }, [level.level, level.number_fields]);

  useEffect(() => {
    if (feedback?.kind !== "wrong") return;
    setAnswer("");
    setNumberParts(Array.from({ length: numberFieldCount }, () => ""));
    setSelectedOptionId(null);
    setSelectedOptionIds([]);
    setCodeFocusToken((token) => (token ?? 0) + 1);
    requestAnimationFrame(() => {
      textInputRef.current?.focus({ preventScroll: true });
      textInputRef.current?.select();
    });
  }, [feedback?.id, feedback?.kind, numberFieldCount]);

  function submitRevealSolution() {
    if (revealSubmittedRef.current || disabled || isPending || !canPaceTeam) return;
    revealSubmittedRef.current = true;
    onSubmitRef.current({ revealSolution: true });
  }

  function revealAndSkip() {
    if (!allowReveal || disabled || isPending || solutionShown) return;
    setSolutionRevealed(true);
    onRevealRef.current?.();
  }

  useEffect(() => {
    if (
      !allowReveal ||
      !scoringSnapshot?.isExpired ||
      !scoringSnapshot.hasCountdown ||
      solutionShown ||
      disabled ||
      isPending
    ) {
      return;
    }
    setSolutionRevealed(true);
    onRevealRef.current?.();
  }, [
    allowReveal,
    scoringSnapshot?.isExpired,
    scoringSnapshot?.hasCountdown,
    solutionShown,
    disabled,
    isPending,
  ]);

  useEffect(() => {
    if (
      level.type !== "gps" ||
      !autoSubmitGps ||
      !withinRadius ||
      !sample ||
      disabled ||
      isPending ||
      autoTriggered ||
      solutionShown
    ) {
      return;
    }

    setAutoTriggered(true);
    onSubmitRef.current({ geolocation: sample });
  }, [
    level.type,
    autoSubmitGps,
    withinRadius,
    sample,
    disabled,
    isPending,
    autoTriggered,
    solutionShown,
  ]);

  function digitalAnswerValue(): string {
    if (inputMode === "confirm") return "ok";
    if (isCodeBoxes) {
      return numberParts.map((p) => p.trim()).join("");
    }
    return answer;
  }

  function handleSubmit() {
    if (solutionShown) {
      submitRevealSolution();
      return;
    }
    if (level.type === "gps") {
      if (!sample) return;
      onSubmit({ geolocation: sample });
      return;
    }
    if (level.type === "digital") {
      onSubmit({ answer: digitalAnswerValue() });
      return;
    }
    if (level.type === "quiz" && level.correct_option_ids?.length) {
      if (selectedOptionIds.length === 0) return;
      onSubmit({ selectedOptionIds });
      return;
    }
    if (level.type === "quiz" && selectedOptionId) {
      onSubmit({ selectedOptionId });
    }
  }

  const revealBlock = solutionShown ? (
    <div className="space-y-3">
      <p
        className={
          cityStyle
            ? "flex items-center justify-center gap-2 rounded-2xl bg-[var(--cg-secondary)] py-4 text-base font-semibold text-[var(--cg-fg)]"
            : "flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-4 text-base font-semibold text-slate-800"
        }
      >
        <Check className="h-5 w-5 text-[var(--cg-success)]" />
        Lösung: {solutionText}
      </p>
      <p
        className={
          cityStyle
            ? "text-center text-sm font-medium text-[var(--cg-muted)]"
            : "text-center text-sm text-slate-500"
        }
      >
        Aufgabe abgeschlossen · 0 Punkte
      </p>
      {canPaceTeam ? (
        cityStyle ? (
          <BigButton disabled={disabled || isPending} onClick={submitRevealSolution}>
            {isPending ? "Sende…" : "Weiter"}
          </BigButton>
        ) : (
          <GridButton
            type="button"
            disabled={disabled || isPending}
            onClick={submitRevealSolution}
          >
            {isPending ? "Sende…" : "Weiter"}
          </GridButton>
        )
      ) : (
        <TeamPaceHint canPaceTeam={false} leadLabel={leadLabel} />
      )}
    </div>
  ) : null;

  const revealButton =
    allowReveal && !solutionShown ? (
      <RevealSolutionControl
        disabled={disabled || isPending}
        onConfirmReveal={revealAndSkip}
      />
    ) : null;

  const isMultiQuiz = level.type === "quiz" && Boolean(level.correct_option_ids?.length);

  const canSubmit =
    level.type === "gps"
      ? isNavigator && withinRadius
      : level.type === "digital"
        ? inputMode === "confirm"
          ? true
          : isCodeBoxes
            ? numberParts.every((p) => p.trim().length > 0)
            : Boolean(answer.trim())
        : level.type === "quiz"
          ? isMultiQuiz
            ? selectedOptionIds.length > 0
            : Boolean(selectedOptionId)
          : false;

  // Stale "correct" after remount/phase with empty form — hide so it does not look like praise for blank input.
  const formLooksEmpty =
    level.type === "digital"
      ? inputMode === "confirm"
        ? false
        : isCodeBoxes
          ? numberParts.every((p) => !p.trim())
          : !answer.trim()
      : level.type === "quiz"
        ? isMultiQuiz
          ? selectedOptionIds.length === 0
          : !selectedOptionId
        : false;
  const visibleFeedback =
    feedback?.kind === "correct" && formLooksEmpty ? null : feedback;

  if (level.type === "gps" && !isNavigator) {
    if (cityStyle) {
      return (
        <LevelTaskCard>
          <SectionLabel>Wegpunkt</SectionLabel>
          <p className="text-sm text-[var(--cg-muted)]">
            Der Team-Leiter bestätigt diesen Wegpunkt vor Ort. Ihr könnt parallel Hinweise nutzen und
            Rätsel lösen.
          </p>
        </LevelTaskCard>
      );
    }
    return (
      <GridHint tone="info">
        Der Team-Leiter bestätigt diesen Wegpunkt vor Ort. Ihr könnt parallel Hinweise nutzen und
        Rätsel lösen.
      </GridHint>
    );
  }

  const scoringBlock =
    hideScoring
      ? null
      : level.scoring && hasLiveLevelScoring(level.scoring) ? (
      <LevelScoringBar
        scoring={level.scoring}
        startedAt={levelStartedAt}
        fallbackStartedAt={fallbackStartedAt}
        compact={cityStyle}
      />
    ) : level.scoring ? (
      <div className="flex flex-wrap gap-2 text-xs">
        <span
          className={
            cityStyle
              ? "rounded-full bg-[var(--cg-secondary)] px-2.5 py-1 font-semibold text-[var(--cg-fg)]"
              : "rounded-full bg-slate-100 px-2.5 py-1 text-slate-600"
          }
        >
          {level.scoring.points >= 0 ? "+" : ""}
          {level.scoring.points} Punkte
        </span>
      </div>
    ) : null;

  const gpsStatus =
    level.type === "gps" && level.location && !hideGpsStatus ? (
      <div
        className={
          cityStyle
            ? "rounded-2xl bg-[var(--cg-bg)] px-4 py-3 text-sm text-[var(--cg-muted)]"
            : "rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        }
      >
        {gpsLoading ? <p>Standort wird ermittelt…</p> : null}
        {gpsError ? <p className="text-[var(--cg-destructive)]">{gpsError}</p> : null}
        {sample ? (
          <>
            <p className="inline-flex items-center gap-1.5">
              <IconMapPin size={14} className="text-[var(--cg-primary)]" />
              Entfernung:{" "}
              <span className="font-semibold text-[var(--cg-fg)]">
                {distance !== null ? formatDistance(distance) : "—"}
              </span>
            </p>
            <p className="mt-1">
              {withinRadius ? (
                <span className="inline-flex items-center gap-1 font-medium text-[var(--cg-success)]">
                  <IconCheck size={14} />
                  {autoSubmitGps && autoTriggered
                    ? "Wegpunkt wird bestätigt…"
                    : autoSubmitGps
                      ? "Am Ziel — wird automatisch aktiviert"
                      : "Am Ziel"}
                </span>
              ) : (
                <span className="text-amber-700">Unterwegs zum Ziel</span>
              )}
            </p>
          </>
        ) : null}
      </div>
    ) : null;

  if (cityStyle) {
    const formMotionClass =
      feedback?.kind === "wrong"
        ? "cg-animate-shake"
        : feedback?.kind === "correct"
          ? "cg-animate-success-pulse"
          : "";

    return (
      <LevelTaskCard>
        {level.question ? (
          <p className="break-words text-base font-bold leading-snug text-[var(--cg-fg)] [overflow-wrap:anywhere] sm:text-lg">
            {level.question}
          </p>
        ) : null}

        {scoringBlock}
        {gpsStatus}

        {solutionShown ? (
          revealBlock
        ) : (
          <div key={feedback?.id ?? "idle"} className={`space-y-4 ${formMotionClass}`}>
            {level.type === "digital" && inputMode === "text" && !isCodeBoxes ? (
              <input
                ref={textInputRef}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Antwort eintragen…"
                disabled={disabled || isPending}
                className={`w-full rounded-2xl border-2 bg-[var(--cg-bg)] px-4 py-5 text-center text-2xl font-bold tracking-widest text-[var(--cg-fg)] outline-none placeholder:text-[var(--cg-muted)] focus:border-[var(--cg-primary)] disabled:opacity-50 ${
                  feedback?.kind === "wrong"
                    ? "border-[var(--cg-destructive)]"
                    : feedback?.kind === "correct"
                      ? "border-[var(--cg-success)]"
                      : "border-[var(--cg-input)]"
                }`}
              />
            ) : null}

            {level.type === "digital" && isCodeBoxes ? (
              <CodeBoxesInput
                count={numberFieldCount}
                values={numberParts}
                onChange={setNumberParts}
                disabled={disabled || isPending}
                focusToken={codeFocusToken}
              />
            ) : null}

            {level.type === "digital" && inputMode === "confirm" ? (
              <p className="pt-1 text-center text-sm text-[var(--cg-muted)]">
                Tippt OK, wenn ihr fertig seid.
              </p>
            ) : null}

            {level.type === "quiz" && level.options ? (
              <div className="space-y-2">
                {level.options.map((option) => {
                  const multiSelected = selectedOptionIds.includes(option.id);
                  const singleSelected = selectedOptionId === option.id;
                  const selected = isMultiQuiz ? multiSelected : singleSelected;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled || isPending}
                      onClick={() => {
                        if (isMultiQuiz) {
                          setSelectedOptionIds((prev) =>
                            prev.includes(option.id)
                              ? prev.filter((id) => id !== option.id)
                              : [...prev, option.id],
                          );
                        } else {
                          setSelectedOptionId(option.id);
                        }
                      }}
                      className={`w-full rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition disabled:opacity-50 ${
                        selected
                          ? "border-[var(--cg-primary)] bg-[var(--cg-primary)]/15 text-[var(--cg-fg)]"
                          : "border-[var(--cg-border)] bg-[var(--cg-bg)] text-[var(--cg-fg)]"
                      }`}
                    >
                      <span className="break-words [overflow-wrap:anywhere]">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {level.type === "gps" && autoSubmitGps ? (
              <p className="text-center text-sm text-[var(--cg-muted)]">
                {withinRadius
                  ? "Kein Tippen nötig — der Wegpunkt wird automatisch bestätigt."
                  : "Zum Zielpunkt laufen — die Aufgabe startet automatisch in der Nähe."}
              </p>
            ) : (
              <BigButton
                disabled={disabled || isPending || !canSubmit}
                onClick={handleSubmit}
              >
                {isPending
                  ? "Sende…"
                  : level.type === "gps"
                    ? "Wegpunkt bestätigen"
                    : inputMode === "confirm"
                      ? "OK"
                      : "Antwort prüfen"}
              </BigButton>
            )}

            {level.type === "gps" && isNavigator ? (
              <div className="space-y-2">
                <BigButton
                  variant="outline"
                  disabled={disabled || isPending}
                  onClick={() =>
                    onSubmit({
                      geolocation: sample ?? undefined,
                      forceUnlock: "geofence",
                    })
                  }
                >
                  Wir sind am Punkt
                </BigButton>
                <p className="text-center text-xs text-[var(--cg-muted)]">
                  Wenn GPS hängt — Alpha öffnet fürs Team.
                </p>
              </div>
            ) : null}

            <SolveFeedbackBanner feedback={visibleFeedback} />
            {revealButton}
          </div>
        )}
      </LevelTaskCard>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      {level.question ? (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-700">Frage</p>
          <div className="mt-2 rounded-2xl bg-[#e8913a] px-4 py-3 text-center text-sm font-semibold text-white">
            {level.question}
          </div>
        </div>
      ) : null}

      {scoringBlock ? <div className="mb-4">{scoringBlock}</div> : null}
      {gpsStatus ? <div className="mb-4">{gpsStatus}</div> : null}

      {solutionShown ? (
        revealBlock
      ) : (
        <>
          {level.type === "digital" && inputMode === "text" && !isCodeBoxes ? (
            <div>
              <GridLabel>Deine Antwort</GridLabel>
              <GridInput
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Lösung eingeben"
                disabled={disabled || isPending}
              />
            </div>
          ) : null}

          {level.type === "digital" && isCodeBoxes ? (
            <CodeBoxesInput
              count={numberFieldCount}
              values={numberParts}
              onChange={setNumberParts}
              disabled={disabled || isPending}
              focusToken={codeFocusToken}
              className="flex flex-wrap justify-center gap-2"
              inputClassName="h-12 w-12 rounded-md border border-slate-200 text-center text-lg font-bold uppercase outline-none focus:border-slate-400 disabled:opacity-50"
            />
          ) : null}

          {level.type === "digital" && inputMode === "confirm" ? (
            <p className="text-sm text-slate-600">Tippt OK, wenn ihr fertig seid.</p>
          ) : null}

          {level.type === "quiz" && level.options ? (
            <div className="flex flex-col gap-2">
              {level.options.map((option) => {
                const multiSelected = selectedOptionIds.includes(option.id);
                const singleSelected = selectedOptionId === option.id;
                const selected = isMultiQuiz ? multiSelected : singleSelected;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={disabled || isPending}
                    onClick={() => {
                      if (isMultiQuiz) {
                        setSelectedOptionIds((prev) =>
                          prev.includes(option.id)
                            ? prev.filter((id) => id !== option.id)
                            : [...prev, option.id],
                        );
                      } else {
                        setSelectedOptionId(option.id);
                      }
                    }}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selected
                        ? "border-teal-500 bg-teal-50 font-medium text-teal-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {level.type === "gps" && autoSubmitGps ? (
            <p className="mt-4 text-sm text-slate-500">
              {withinRadius
                ? "Kein Tippen nötig — der Wegpunkt wird automatisch bestätigt."
                : "Zum Zielpunkt laufen — die Aufgabe startet automatisch in der Nähe."}
            </p>
          ) : (
            <GridButton
              type="button"
              className="mt-4"
              disabled={disabled || isPending || !canSubmit}
              onClick={handleSubmit}
            >
              {isPending
                ? "Sende…"
                : level.type === "gps"
                  ? "Wegpunkt bestätigen"
                  : inputMode === "confirm"
                    ? "OK"
                    : "Antwort senden"}
            </GridButton>
          )}

          {level.type === "gps" && isNavigator ? (
            <GridButton
              type="button"
              variant="secondary"
              className="mt-2"
              disabled={disabled || isPending}
              onClick={() =>
                onSubmit({
                  geolocation: sample ?? undefined,
                  forceUnlock: "geofence",
                })
              }
            >
              Wir sind am Punkt
            </GridButton>
          ) : null}

          {revealButton}
          <div className="mt-3">
            <SolveFeedbackBanner feedback={visibleFeedback} />
          </div>
        </>
      )}
    </div>
  );
}
