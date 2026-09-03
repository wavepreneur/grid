"use client";

import { useMemo, useState } from "react";
import { savePortalSnapshot } from "@/app/actions/portal";
import {
  GridButton,
  GridError,
  GridInput,
  GridLabel,
  GridSuccess,
} from "@/components/grid/grid-shell";
import {
  PORTAL_DURATION_OPTIONS,
  type PortalSaveInput,
  type PortalSnapshot,
} from "@/lib/grid/portal";

type Props = {
  initial: PortalSnapshot;
};

function parseCoordinatePair(value: string): { lat: number; lng: number } | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function EventPortalForm({ initial }: Props) {
  const [duration, setDuration] = useState(String(initial.duration_minutes));
  const [waypoints, setWaypoints] = useState(initial.waypoints);
  const [quizzes, setQuizzes] = useState(initial.quizzes);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const durationChoices = useMemo(() => {
    const values = new Set<number>(PORTAL_DURATION_OPTIONS);
    values.add(initial.duration_minutes);
    return [...values].sort((a, b) => a - b);
  }, [initial.duration_minutes]);

  function updateWaypoint(level: number, latRaw: string, lngRaw: string) {
    const pair = parseCoordinatePair(latRaw) ?? parseCoordinatePair(`${latRaw} ${lngRaw}`);
    setWaypoints((current) =>
      current.map((waypoint) => {
        if (waypoint.level !== level) return waypoint;
        if (pair) return { ...waypoint, lat: pair.lat, lng: pair.lng };
        return {
          ...waypoint,
          lat: Number(latRaw),
          lng: Number(lngRaw),
        };
      }),
    );
  }

  async function copyAccess(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
    } catch {
      setCopiedCode(null);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);

    const payload: PortalSaveInput = {
      duration_minutes: Number(duration),
      waypoints: waypoints.map((waypoint) => ({
        level: waypoint.level,
        lat: waypoint.lat,
        lng: waypoint.lng,
      })),
      quizzes: quizzes
        .filter((quiz) => quiz.question.trim() || quiz.answers.some((answer) => answer.trim()))
        .map((quiz) => ({
          level: quiz.level,
          question: quiz.question,
          answers: quiz.answers,
          correct_index: quiz.correct_index,
        })),
    };

    const result = await savePortalSnapshot(initial.token, payload);
    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setWaypoints(result.data.waypoints);
    setQuizzes(result.data.quizzes);
    setDuration(String(result.data.duration_minutes));
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Teams" value={initial.team_count} />
        <Stat label="Spieler" value={initial.player_seats} />
        <Stat label="Minuten" value={duration} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Spieldauer</h2>
        <GridLabel hint="Gilt sofort für alle Teams dieses Events.">Dauer</GridLabel>
        <select
          value={duration}
          disabled={initial.locked}
          onChange={(event) => setDuration(event.target.value)}
          className="grid-input w-full rounded-xl px-4 py-3.5 text-base outline-none"
        >
          {durationChoices.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} Min.
            </option>
          ))}
        </select>
      </section>

      {initial.show_waypoints ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Koordinaten</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Nur die Zahlen überschreiben. Radius und Aufgaben bleiben unverändert.
            </p>
          </div>
          {waypoints.map((waypoint) => (
            <fieldset
              key={waypoint.level}
              className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <legend className="px-1 text-sm font-semibold text-slate-800">
                Aufgabe {waypoint.level} · {waypoint.title}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <GridLabel>Latitude</GridLabel>
                  <GridInput
                    inputMode="decimal"
                    disabled={initial.locked}
                    value={Number.isFinite(waypoint.lat) ? String(waypoint.lat) : ""}
                    onChange={(event) =>
                      updateWaypoint(waypoint.level, event.target.value, String(waypoint.lng))
                    }
                  />
                </div>
                <div>
                  <GridLabel>Longitude</GridLabel>
                  <GridInput
                    inputMode="decimal"
                    disabled={initial.locked}
                    value={Number.isFinite(waypoint.lng) ? String(waypoint.lng) : ""}
                    onChange={(event) =>
                      updateWaypoint(waypoint.level, String(waypoint.lat), event.target.value)
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Du kannst auch 52.37387, 9.73816 ins erste Feld einfügen.
              </p>
            </fieldset>
          ))}
        </section>
      ) : null}

      {quizzes.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Unternehmensquiz</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Ersetzt nur die Einstiegsfragen. Hauptaufgaben und Bonus bleiben unberührt.
            </p>
          </div>
          {quizzes.map((quiz, quizIndex) => (
            <fieldset
              key={quiz.level}
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <legend className="px-1 text-sm font-semibold text-slate-800">
                Aufgabe {quiz.level} · {quiz.title}
              </legend>
              <div>
                <GridLabel>Frage</GridLabel>
                <textarea
                  disabled={initial.locked}
                  rows={3}
                  value={quiz.question}
                  onChange={(event) =>
                    setQuizzes((current) =>
                      current.map((item, index) =>
                        index === quizIndex ? { ...item, question: event.target.value } : item,
                      ),
                    )
                  }
                  className="grid-input w-full rounded-xl px-4 py-3 text-base outline-none"
                  placeholder="Eure Frage an das Team"
                />
              </div>
              {quiz.answers.map((answer, answerIndex) => (
                <label key={answerIndex} className="flex items-start gap-3">
                  <input
                    type="radio"
                    name={`quiz-${quiz.level}-correct`}
                    className="mt-4"
                    disabled={initial.locked}
                    checked={quiz.correct_index === answerIndex}
                    onChange={() =>
                      setQuizzes((current) =>
                        current.map((item, index) =>
                          index === quizIndex
                            ? { ...item, correct_index: answerIndex as 0 | 1 | 2 | 3 }
                            : item,
                        ),
                      )
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <GridLabel>
                      Antwort {String.fromCharCode(65 + answerIndex)}
                      {quiz.correct_index === answerIndex ? " (richtig)" : ""}
                    </GridLabel>
                    <GridInput
                      disabled={initial.locked}
                      value={answer}
                      onChange={(event) =>
                        setQuizzes((current) =>
                          current.map((item, index) =>
                            index === quizIndex
                              ? {
                                  ...item,
                                  answers: item.answers.map((value, inner) =>
                                    inner === answerIndex ? event.target.value : value,
                                  ) as PortalSnapshot["quizzes"][number]["answers"],
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                </label>
              ))}
            </fieldset>
          ))}
        </section>
      ) : null}

      {initial.accesses.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Zugänge</h2>
          <p className="text-sm leading-6 text-slate-500">
            Diese Codes gehen an die Teams. Ein Code, ein Platz.
          </p>
          <ul className="space-y-2">
            {initial.accesses.map((access) => (
              <li
                key={access.access_code}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{access.team_name}</p>
                  <p className="font-mono text-base tracking-wide text-teal-700">
                    {access.access_code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyAccess(access.access_code)}
                  className="shrink-0 text-sm font-medium text-teal-700 hover:underline"
                >
                  {copiedCode === access.access_code ? "Kopiert" : "Kopieren"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <GridError message={error} /> : null}
      {saved ? <GridSuccess message="Änderungen sind live. Die Teams können sofort starten." /> : null}

      {initial.locked ? (
        <p className="text-sm text-slate-500">Dieses Event ist abgeschlossen.</p>
      ) : (
        <GridButton type="submit" disabled={pending}>
          {pending ? "Speichert…" : "Änderungen speichern"}
        </GridButton>
      )}
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
