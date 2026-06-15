"use client";

import { useState } from "react";
import {
  GridButton,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";
import { distanceMeters, formatDistance } from "@/lib/grid/geofence";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import type { LevelDefinition } from "@/lib/grid/level-types";

type LevelPanelProps = {
  level: LevelDefinition;
  disabled: boolean;
  isPending: boolean;
  onSubmit: (payload: {
    answer?: string;
    selectedOptionId?: string;
    geolocation?: { lat: number; lng: number; accuracy?: number };
  }) => void;
};

export function LevelPanel({
  level,
  disabled,
  isPending,
  onSubmit,
}: LevelPanelProps) {
  const [answer, setAnswer] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const gpsEnabled = level.type === "gps" && Boolean(level.location);
  const { sample, error: gpsError, isLoading: gpsLoading } = useGeolocation(gpsEnabled);

  const distance =
    sample && level.location
      ? distanceMeters(sample, level.location)
      : null;

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

  return (
    <div className="rounded-xl border border-[var(--grid-border)] bg-black/20 p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
          Level {level.level} · {level.type.toUpperCase()}
        </p>
        {level.type === "gps" ? (
          <span className="text-xs text-[var(--grid-accent)]">GPS aktiv</span>
        ) : (
          <span className="text-xs text-[var(--grid-muted)]">Kein GPS nötig</span>
        )}
      </div>

      <h2 className="mt-3 text-2xl font-semibold text-white">{level.title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--grid-muted)]">
        {level.description}
      </p>

      {level.type === "gps" && level.location ? (
        <div className="mt-4 rounded-xl border border-[var(--grid-border)] bg-black/30 px-4 py-3 text-sm text-[var(--grid-muted)]">
          {gpsLoading ? (
            <p>GPS-Position wird ermittelt…</p>
          ) : null}
          {gpsError ? <p className="text-red-300">{gpsError}</p> : null}
          {sample ? (
            <>
              <p>
                Entfernung zum Checkpoint:{" "}
                <span className="text-white">
                  {distance !== null ? formatDistance(distance) : "—"}
                </span>
              </p>
              <p className="mt-1">
                Radius: {level.location.radius_meters} m ·{" "}
                {withinRadius ? (
                  <span className="text-emerald-300">Im Zielbereich</span>
                ) : (
                  <span className="text-amber-300">Noch nicht am Ziel</span>
                )}
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      {level.type === "digital" ? (
        <div className="mt-4">
          <GridLabel>Antwort</GridLabel>
          <GridInput
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Lösung eingeben"
            disabled={disabled || isPending}
          />
        </div>
      ) : null}

      {level.type === "quiz" && level.options ? (
        <div className="mt-4 flex flex-col gap-2">
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
        className="mt-6"
        disabled={
          disabled ||
          isPending ||
          (level.type === "gps" && !withinRadius) ||
          (level.type === "digital" && !answer.trim()) ||
          (level.type === "quiz" && !selectedOptionId)
        }
        onClick={handleSubmit}
      >
        {isPending ? "Sende…" : "Level abschließen"}
      </GridButton>
    </div>
  );
}
