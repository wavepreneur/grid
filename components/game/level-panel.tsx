"use client";

import { useState } from "react";
import {
  GridButton,
  GridHint,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";
import { distanceMeters, formatDistance, isWithinGeofenceForPlay } from "@/lib/grid/geofence";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import type { LevelDefinition } from "@/lib/grid/level-types";
import { playGeoError, playUi } from "@/lib/grid/play-ui";

type LevelPanelProps = {
  level: LevelDefinition;
  disabled: boolean;
  isPending: boolean;
  isNavigator: boolean;
  onSubmit: (payload: {
    answer?: string;
    selectedOptionId?: string;
    geolocation?: { lat: number; lng: number; accuracy?: number };
    forceUnlock?: "geofence" | "distance";
  }) => void;
  language?: string | null;
};

export function LevelPanel({
  level,
  disabled,
  isPending,
  isNavigator,
  onSubmit,
  language,
}: LevelPanelProps) {
  const t = playUi(language);
  const [answer, setAnswer] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const gpsEnabled = level.type === "gps" && Boolean(level.location) && isNavigator;
  const { sample, errorKind, isLoading: gpsLoading } = useGeolocation(gpsEnabled);
  const gpsError = playGeoError(language, errorKind);

  const distance =
    sample && level.location
      ? distanceMeters(sample, level.location)
      : null;

  const withinRadius =
    sample && level.location ? isWithinGeofenceForPlay(sample, level.location) : false;

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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">
          {t.sync.taskN(level.level)}
        </p>
        {level.type === "gps" ? (
          <span className="text-xs font-medium text-teal-600">
            {isNavigator ? t.solve.gpsLead : t.solve.gpsOnSite}
          </span>
        ) : null}
      </div>

      <h2 className="mt-3 text-2xl font-semibold text-slate-900">{level.title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{level.description}</p>

      {level.type === "gps" && level.location && isNavigator ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {gpsLoading ? <p>{t.solve.locating}</p> : null}
          {gpsError ? <p className="text-red-600">{gpsError}</p> : null}
          {sample ? (
            <>
              <p>
                {t.solve.distance}{" "}
                <span className="font-semibold text-slate-900">
                  {distance !== null ? formatDistance(distance) : "—"}
                </span>
              </p>
              <p className="mt-1">
                {withinRadius ? (
                  <span className="font-medium text-emerald-700">{t.solve.atTarget}</span>
                ) : (
                  <span className="text-amber-700">{t.solve.stillWalking}</span>
                )}
              </p>
            </>
          ) : !gpsLoading && !gpsError ? (
            <p>{t.solve.allowLocation}</p>
          ) : null}
        </div>
      ) : null}

      {level.type === "gps" && !isNavigator ? (
        <div className="mt-4">
          <GridHint tone="info">
            {t.solve.leadConfirms}
          </GridHint>
        </div>
      ) : null}

      {level.type === "digital" ? (
        <div className="mt-4">
          <GridLabel>{t.solve.answerLabel}</GridLabel>
          <GridInput
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder={t.solve.placeholder}
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
                  ? "border-teal-500 bg-teal-50 font-medium text-teal-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {level.type === "gps" && !isNavigator ? null : (
        <div className="mt-6 flex flex-col gap-2">
          <GridButton
            type="button"
            disabled={
              disabled ||
              isPending ||
              (level.type === "gps" && (!isNavigator || !withinRadius)) ||
              (level.type === "digital" && !answer.trim()) ||
              (level.type === "quiz" && !selectedOptionId)
            }
            onClick={handleSubmit}
          >
            {isPending ? t.solve.sending : t.solve.completeTask}
          </GridButton>
          {level.type === "gps" && isNavigator ? (
            <GridButton
              type="button"
              variant="secondary"
              disabled={disabled || isPending}
              onClick={() =>
                onSubmit({
                  geolocation: sample ?? undefined,
                  forceUnlock: "geofence",
                })
              }
            >
              {t.menu.atPointCta}
            </GridButton>
          ) : null}
        </div>
      )}
    </div>
  );
}
