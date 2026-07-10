"use client";

import { useEffect, useRef, useState } from "react";
import {
  GridButton,
  GridHint,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";
import { IconCheck, IconMapPin } from "@/components/cms/studio-icons";
import { distanceMeters, formatDistance } from "@/lib/grid/geofence";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { LevelScoringBar } from "@/components/game/level-scoring-bar";
import { hasLiveLevelScoring } from "@/lib/grid/level-scoring";
import type { LevelDefinition, SolveLevelPayload } from "@/lib/grid/level-types";

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
}: LevelSolvePanelProps) {
  const [answer, setAnswer] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const gpsEnabled = level.type === "gps" && Boolean(level.location) && isNavigator;
  const { sample, error: gpsError, isLoading: gpsLoading } = useGeolocation(gpsEnabled);

  const distance =
    sample && level.location ? distanceMeters(sample, level.location) : null;

  const withinRadius =
    sample && level.location && distance !== null
      ? distance <= level.location.radius_meters
      : false;

  useEffect(() => {
    setAutoTriggered(false);
    setAnswer("");
    setSelectedOptionId(null);
    setSelectedOptionIds([]);
  }, [level.level]);

  useEffect(() => {
    if (
      level.type !== "gps" ||
      !autoSubmitGps ||
      !withinRadius ||
      !sample ||
      disabled ||
      isPending ||
      autoTriggered
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
  ]);

  function handleSubmit() {
    if (level.type === "gps") {
      if (!sample) return;
      onSubmit({ geolocation: sample });
      return;
    }
    if (level.type === "digital") {
      onSubmit({ answer });
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

  const isMultiQuiz = level.type === "quiz" && Boolean(level.correct_option_ids?.length);

  const canSubmit =
    level.type === "gps"
      ? isNavigator && withinRadius
      : level.type === "digital"
        ? Boolean(answer.trim())
        : level.type === "quiz"
          ? isMultiQuiz
            ? selectedOptionIds.length > 0
            : Boolean(selectedOptionId)
          : false;

  if (level.type === "gps" && !isNavigator) {
    return (
      <GridHint tone="info">
        Der Team-Leiter bestätigt diesen Wegpunkt vor Ort. Ihr könnt parallel Hinweise nutzen und
        Rätsel lösen.
      </GridHint>
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

      {level.scoring && hasLiveLevelScoring(level.scoring) ? (
        <div className="mb-4">
          <LevelScoringBar
            scoring={level.scoring}
            startedAt={levelStartedAt}
            fallbackStartedAt={fallbackStartedAt}
          />
        </div>
      ) : level.scoring ? (
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            {level.scoring.points >= 0 ? "+" : ""}
            {level.scoring.points} Punkte
          </span>
        </div>
      ) : null}

      {level.type === "gps" && level.location && !hideGpsStatus ? (
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {gpsLoading ? <p>Standort wird ermittelt…</p> : null}
          {gpsError ? <p className="text-red-600">{gpsError}</p> : null}
          {sample ? (
            <>
              <p className="inline-flex items-center gap-1.5">
                <IconMapPin size={14} className="text-teal-600" />
                Entfernung:{" "}
                <span className="font-semibold text-slate-900">
                  {distance !== null ? formatDistance(distance) : "—"}
                </span>
              </p>
              <p className="mt-1">
                {withinRadius ? (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
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
      ) : null}

      {level.type === "digital" ? (
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
          {isPending ? "Sende…" : level.type === "gps" ? "Wegpunkt bestätigen" : "Antwort senden"}
        </GridButton>
      )}
    </div>
  );
}
