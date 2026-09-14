"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { savePortalSnapshot } from "@/app/actions/portal";
import {
  GridButton,
  GridError,
  GridInput,
  GridLabel,
  GridSuccess,
} from "@/components/grid/grid-shell";
import { EventIntelligencePanel } from "@/components/event/event-intelligence-panel";
import { EventProgressPanel } from "@/components/event/event-progress-panel";
import { eventPortalGalleryPath, eventPortalResultsPath } from "@/lib/grid/event-routes";
import {
  PORTAL_DURATION_OPTIONS,
  type PortalAccess,
  type PortalSaveInput,
  type PortalSnapshot,
} from "@/lib/grid/portal";

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (typeof window === "undefined") return pathOrUrl;
  return `${window.location.origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function downloadAccessCsv(title: string, accesses: PortalAccess[]) {
  const rows = [
    ["Team", "Zugangscode", "Spiel-Link"],
    ...accesses.map((access) => [access.team_name, access.access_code, absoluteUrl(access.play_url)]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${title.replaceAll(/\s+/g, "-").toLowerCase()}-zugaenge.csv`;
  link.click();
  URL.revokeObjectURL(href);
}

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

  const [goHost, setGoHost] = useState("gridos.vercel.app/go");
  const [goUrl, setGoUrl] = useState("https://gridos.vercel.app/go");
  const showPrepare = initial.show_waypoints || initial.show_quizzes;

  useEffect(() => {
    const origin = window.location.origin;
    setGoUrl(`${origin}/go`);
    setGoHost(`${origin.replace(/^https?:\/\//, "")}/go`);
  }, []);

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

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCode(value);
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
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Teams" value={initial.team_count} />
        <Stat label="Spieler" value={initial.player_seats} />
        <Stat label="Minuten" value={duration} />
      </section>

      {showPrepare ? (
        <JourneyStep
          number={1}
          title="Event vorbereiten"
          hint="Route und Firmenfragen — so sieht der Kunde die gebuchten Module."
        >
          <div className="rounded-2xl border border-dashed border-teal-700/30 bg-[linear-gradient(180deg,#ecfdf5_0%,#f8fafc_55%)] p-4">
            <div className="relative overflow-hidden rounded-xl bg-teal-900/90 px-4 py-8 text-center text-white">
              <MapSketch />
              <p className="relative text-sm font-semibold">Karte kommt als Nächstes</p>
              <p className="relative mt-1 text-xs leading-5 text-teal-100">
                In der Testphase: Felder unten durchgehen. Speichern auf der Karte folgt im nächsten
                Schritt.
              </p>
            </div>
          </div>

          <div>
            <GridLabel hint="Gilt sofort für alle Teams dieses Events.">Spieldauer</GridLabel>
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
          </div>

          {initial.show_waypoints ? (
            waypoints.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Startpunkte überschreiben</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Nur die Koordinaten. Radius und Aufgaben bleiben unverändert.
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
              </div>
            ) : (
              <EmptyModule
                title="Eigene Routen"
                body="Hier erscheinen die GPS-Punkte zum Verschieben. Die Karten-Ansicht folgt — das Modul ist für dieses Event schon frei."
              />
            )
          ) : null}

          {initial.show_quizzes ? (
            quizzes.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Unternehmensquiz</h3>
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
              </div>
            ) : (
              <EmptyModule
                title="Eigene Quizfragen"
                body="Hier erscheinen die Firmenfragen zum Überschreiben. Das Modul ist frei — sobald das Spiel Quiz-Slots hat, siehst du sie an dieser Stelle."
              />
            )
          ) : null}

          {error ? <GridError message={error} /> : null}
          {saved ? (
            <GridSuccess message="Änderungen sind live. Die Teams können sofort starten." />
          ) : null}

          {initial.locked ? (
            <p className="text-sm text-slate-500">Dieses Event ist abgeschlossen.</p>
          ) : (
            <GridButton type="submit" disabled={pending}>
              {pending ? "Speichert…" : "Änderungen speichern"}
            </GridButton>
          )}
        </JourneyStep>
      ) : (
        <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <GridLabel hint="Gilt sofort für alle Teams dieses Events.">Spieldauer</GridLabel>
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
          {error ? <GridError message={error} /> : null}
          {saved ? (
            <GridSuccess message="Änderungen sind live. Die Teams können sofort starten." />
          ) : null}
          {initial.locked ? null : (
            <GridButton type="submit" disabled={pending}>
              {pending ? "Speichert…" : "Dauer speichern"}
            </GridButton>
          )}
        </section>
      )}

      {initial.accesses.length > 0 ? (
        <JourneyStep
          number={showPrepare ? 2 : 1}
          title="Teams einladen"
          hint={`Spieler öffnen ${goHost} und tippen den Code — keine App.`}
        >
          <div className="rounded-2xl bg-teal-800 px-4 py-5 text-center text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100">
              Code eingeben auf
            </p>
            <a href={goUrl} className="mt-2 inline-block font-mono text-lg font-bold tracking-wide">
              {goHost}
            </a>
            <p className="mt-2 text-sm text-teal-100">
              Alternativ den Link oder QR an den Teamlead schicken.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => downloadAccessCsv(initial.title, initial.accesses)}
              className="text-sm font-medium text-teal-700 hover:underline"
            >
              Zugänge als CSV
            </button>
          </div>
          <ul className="space-y-2">
            {initial.accesses.map((access) => {
              const playUrl = absoluteUrl(access.play_url);
              const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(playUrl)}`;
              return (
                <li
                  key={access.access_code}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt=""
                    width={64}
                    height={64}
                    className="hidden rounded-lg border border-slate-100 bg-white sm:block"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{access.team_name}</p>
                    <p className="font-mono text-xl tracking-[0.18em] text-teal-700">
                      {access.access_code}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => void copyText(playUrl)}
                      className="text-sm font-medium text-teal-700 hover:underline"
                    >
                      {copiedCode === playUrl ? "Link kopiert" : "Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyText(access.access_code)}
                      className="text-sm font-medium text-teal-700 hover:underline"
                    >
                      {copiedCode === access.access_code ? "Kopiert" : "Code"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </JourneyStep>
      ) : null}

      <JourneyStep
        number={(showPrepare ? 2 : 1) + (initial.accesses.length > 0 ? 1 : 0)}
        title="Live sehen"
        hint="Grün = Aufgabe gelöst. Aktualisiert sich von selbst."
      >
        <EventProgressPanel portalToken={initial.token} />
      </JourneyStep>

      <JourneyStep
        number={(showPrepare ? 3 : 2) + (initial.accesses.length > 0 ? 1 : 0)}
        title="Ergebnisse"
        hint="Alle Teams dieses Events — nur mit diesem Cockpit-Link."
      >
        <div className="flex flex-wrap gap-3">
          <a
            href={eventPortalResultsPath(initial.token)}
            className="inline-flex rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Ergebnisse ansehen
          </a>
          <button
            type="button"
            onClick={() => void copyText(absoluteUrl(eventPortalResultsPath(initial.token)))}
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            {copiedCode === absoluteUrl(eventPortalResultsPath(initial.token))
              ? "Link kopiert"
              : "Ergebnis-Link kopieren"}
          </button>
        </div>
      </JourneyStep>

      <JourneyStep
        number={(showPrepare ? 4 : 3) + (initial.accesses.length > 0 ? 1 : 0)}
        title="Galerie"
        hint="Fotos und Videos der Teams — nur mit diesem Link."
      >
        <div className="flex flex-wrap gap-3">
          <a
            href={eventPortalGalleryPath(initial.token)}
            className="inline-flex rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Galerie ansehen
          </a>
          <button
            type="button"
            onClick={() => void copyText(absoluteUrl(eventPortalGalleryPath(initial.token)))}
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            {copiedCode === absoluteUrl(eventPortalGalleryPath(initial.token))
              ? "Link kopiert"
              : "Galerie-Link kopieren"}
          </button>
        </div>
      </JourneyStep>

      {initial.show_intelligence ? (
        <JourneyStep
          number={(showPrepare ? 5 : 4) + (initial.accesses.length > 0 ? 1 : 0)}
          title="Team Intelligence"
          hint="Rohwerte aus dem Event. Die visuelle Zusammenfassung baut später Exitmania."
        >
          <EventIntelligencePanel portalToken={initial.token} />
        </JourneyStep>
      ) : null}
    </form>
  );
}

function JourneyStep({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-800 text-sm font-bold text-white">
          {number}
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-sm leading-6 text-slate-500">{hint}</p>
        </div>
      </div>
      <div className="space-y-4 px-4 py-5 sm:px-5">{children}</div>
    </section>
  );
}

function EmptyModule({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}

function MapSketch() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 320 120"
      aria-hidden
    >
      <path
        d="M12 88 C 48 40, 90 30, 140 58 S 230 110, 308 42"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="6 8"
      />
      <circle cx="58" cy="52" r="7" fill="#5eead4" />
      <circle cx="168" cy="70" r="7" fill="#5eead4" />
      <circle cx="268" cy="48" r="7" fill="#5eead4" />
    </svg>
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
