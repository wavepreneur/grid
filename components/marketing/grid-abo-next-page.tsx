"use client";

import { useState, useTransition } from "react";
import { submitGridDemoRequest } from "@/app/actions/demo-request";

type Props = {
  teamName?: string;
  score?: string;
  resultsUrl?: string;
};

export function GridAboNextPage({ teamName, score, resultsUrl }: Props) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await submitGridDemoRequest({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        company: String(form.get("company") ?? ""),
        note: String(form.get("note") ?? ""),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  return (
    <main className="min-h-[100dvh] bg-[#f8fafc] text-slate-900">
      <div className="mx-auto max-w-2xl px-5 py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
          GRID · für die Organisation
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Das Event ist durch. So bleibt das Spiel bei euch.
        </h1>
        {teamName ? (
          <p className="mt-3 text-base text-slate-600">
            {teamName}
            {score ? ` · ${score} Punkte` : null}
          </p>
        ) : null}

        {resultsUrl ? (
          <p className="mt-4">
            <a
              href={resultsUrl}
              className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
            >
              Kurze Auswertung öffnen →
            </a>
          </p>
        ) : null}

        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-slate-600">
          <p>
            Ihr habt gesehen, wie GRID live läuft: Leute joinen, landen in Teams, spielen. Für die
            Organisation braucht ihr kein neues Spiel zu bauen. Ihr überschreibt Begriffe, Antworten
            und ein paar Bilder auf einer festen Vorlage — und es wirkt wie euer eigenes Spiel.
          </p>
          <ul className="list-disc space-y-2 ps-5">
            <li>Eine Firmen-Seite wie ein eigenes GRID Go: ein Code für alle Teams.</li>
            <li>Intern gezählt. Eigene Highscores. Tausende, zeitgleich oder versetzt.</li>
            <li>Neue Runden über JSON-Vorlagen — kurz oder lang, das ganze Jahr.</li>
            <li>Daten, die HR nutzen kann: wer, wo, wie das Team wirklich gespielt hat.</li>
          </ul>
          <p>
            Kein Spiel-Baukasten. Eine feste Struktur, in der ihr bleibt — und trotzdem wirkt es wie
            Zauberei, weil das Spiel plötzlich zur Firma passt. Abrechnung später als Monatsabo plus
            Credits zum Aktivieren. Exitmania-Buchungen verbrauchen diese Credits nicht.
          </p>
          <p>
            Heute zählt nur der nächste Schritt: 20 Minuten Demo, live überschrieben. Den Termin
            bucht ihr hier — oder auf der GRID-Seite.
          </p>
        </div>

        <section id="demo" className="mt-10 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <h2 className="text-xl font-bold">Demo buchen</h2>
          <p className="mt-2 text-sm text-slate-500">
            20 Minuten. Ihr seht die Vorlage, die Überschreibung und den Join-Code. Kein Pitch-Deck.
          </p>
          {sent ? (
            <p className="mt-5 text-sm font-semibold text-emerald-700">
              Angekommen. Wir melden uns mit einem Termin.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 grid gap-3">
              <input
                name="name"
                required
                placeholder="Name"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none"
              />
              <input
                name="company"
                required
                placeholder="Firma"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none"
              />
              <input
                name="email"
                type="email"
                required
                placeholder="Geschäftliche E-Mail"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none"
              />
              <textarea
                name="note"
                rows={3}
                placeholder="Optional: wann passt es, wie viele Teams?"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none"
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={pending}
                className="rounded-2xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Senden…" : "Demo anfragen"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
