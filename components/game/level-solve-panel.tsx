"use client";

import { useState } from "react";
import {
  GridButton,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";
import { distanceMeters, formatDistance } from "@/lib/grid/geofence";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import type { LevelDefinition, SolveLevelPayload } from "@/lib/grid/level-types";

type LevelSolvePanelProps = {
  level: LevelDefinition;
  disabled: boolean;
  isPending: boolean;
  isNavigator: boolean;
  onSubmit: (payload: SolveLevelPayload) => void;
  hideGpsStatus?: boolean;
};

export function LevelSolvePanel({
  level,
  disabled,
  isPending,
  isNavigator,
  onSubmit,
  hideGpsStatus = false,
}: LevelSolvePanelProps) {
  const [answer, setAnswer] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const gpsEnabled = level.type === "gps" && Boolean(level.location) && isNavigator;
  const { sample, error: gpsError, isLoading: gpsLoading } = useGeolocation(gpsEnabled);

  const distance =
    sample && level.location ? distanceMeters(sample, level.location) : null;

  const withinRadius =
    sample && level.location && distance !== null
      ? distance <= level.location.radius_meters
      : false;

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
    if (level.type === "quiz" && selectedOptionId) {
      onSubmit({ selectedOptionId });
    }
  }

  const canSubmit =
    level.type === "gps"
      ? isNavigator && withinRadius
      : level.type === "digital"
        ? Boolean(answer.trim())
        : level.type === "quiz"
          ? Boolean(selectedOptionId)
          : false;

  if (level.type === "gps" && !isNavigator) {
    return (
      <div className="rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-4 text-sm text-[var(--grid-muted)]">
        Der Team Lead (GPS) bestätigt diesen Checkpoint. Ihr könnt parallel Hinweise nutzen und
        Rätsel lösen.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--grid-border)] bg-black/20 p-4 sm:p-5">
      {level.type === "gps" && level.location && !hideGpsStatus ? (
        <div className="mb-4 rounded-xl border border-[var(--grid-border)] bg-black/30 px-4 py-3 text-sm text-[var(--grid-muted)]">
          {gpsLoading ? <p>GPS wird ermittelt…</p> : null}
          {gpsError ? <p className="text-red-300">{gpsError}</p> : null}
          {sample ? (
            <>
              <p>
                Entfernung:{" "}
                <span className="text-white">
                  {distance !== null ? formatDistance(distance) : "—"}
                </span>
              </p>
              <p className="mt-1">
                {withinRadius ? (
                  <span className="text-emerald-300">Im Checkpoint-Bereich</span>
                ) : (
                  <span className="text-amber-300">Noch nicht am Ziel</span>
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
          {level.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled || isPending}
              onClick={() => setSelectedOptionId(option.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                selectedOptionId === option.id
                  ? "border-[var(--grid-accent)] bg-[var(--grid-accent)]/10 text-white"
                  : "border-[var(--grid-border)] bg-black/20 text-[var(--grid-muted)] hover:border-[var(--grid-accent)]/40"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <GridButton
        type="button"
        className="mt-4"
        disabled={disabled || isPending || !canSubmit}
        onClick={handleSubmit}
      >
        {isPending ? "Sende…" : level.type === "gps" ? "Checkpoint bestätigen" : "Bestätigen"}
      </GridButton>
    </div>
  );
}
