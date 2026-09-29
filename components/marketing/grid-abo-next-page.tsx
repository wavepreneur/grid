"use client";

import { useState, useTransition } from "react";
import { submitGridDemoRequest } from "@/app/actions/demo-request";
import type { PlayUiLang } from "@/lib/grid/play-ui";

type Props = {
  language?: PlayUiLang;
  teamName?: string;
  score?: string;
  resultsUrl?: string;
};

const COPY = {
  de: {
    kicker: "GRID · für die Organisation",
    headline: "Das Event ist durch. So bleibt das Spiel bei euch.",
    points: "Punkte",
    recap: "Kurze Auswertung öffnen →",
    p1: "Ihr habt gesehen, wie GRID live läuft: Leute joinen, landen in Teams, spielen. Für die Organisation braucht ihr kein neues Spiel zu bauen. Ihr überschreibt Begriffe, Antworten und ein paar Bilder auf einer festen Vorlage — und es wirkt wie euer eigenes Spiel.",
    bullets: [
      "Eine Firmen-Seite wie ein eigenes GRID Go: ein Code für alle Teams.",
      "Intern gezählt. Eigene Highscores. Tausende, zeitgleich oder versetzt.",
      "Neue Runden über JSON-Vorlagen — kurz oder lang, das ganze Jahr.",
      "Daten, die HR nutzen kann: wer, wo, wie das Team wirklich gespielt hat.",
    ],
    p2: "Kein Spiel-Baukasten. Eine feste Struktur, in der ihr bleibt — und trotzdem wirkt es wie Zauberei, weil das Spiel plötzlich zur Firma passt. Abrechnung später als Monatsabo plus Credits zum Aktivieren. Exitmania-Buchungen verbrauchen diese Credits nicht.",
    p3: "Heute zählt nur der nächste Schritt: 20 Minuten Demo, live überschrieben. Den Termin bucht ihr hier — oder auf der GRID-Seite.",
    demoTitle: "Demo buchen",
    demoLead: "20 Minuten. Ihr seht die Vorlage, die Überschreibung und den Join-Code. Kein Pitch-Deck.",
    sent: "Angekommen. Wir melden uns mit einem Termin.",
    name: "Name",
    company: "Firma",
    email: "Geschäftliche E-Mail",
    note: "Optional: wann passt es, wie viele Teams?",
    submit: "Demo anfragen",
    sending: "Senden…",
  },
  en: {
    kicker: "GRID · for the organisation",
    headline: "The event is done. This is how the game stays with you.",
    points: "points",
    recap: "Open the short recap →",
    p1: "You’ve seen GRID live: people join, land in teams, play. The organisation doesn’t need to build a new game. You overwrite terms, answers and a few images on a fixed template — and it feels like your own game.",
    bullets: [
      "A company page like your own GRID Go: one code for every team.",
      "Counted internally. Your own highscores. Thousands at once or in waves.",
      "New rounds from JSON templates — short or long, all year.",
      "Data HR can use: who, where, how the team actually played.",
    ],
    p2: "Not a game builder. A fixed structure you stay in — and it still feels like magic because the game suddenly fits the company. Billing later as a monthly plan plus credits to go live. Exitmania bookings do not spend those credits.",
    p3: "Today only the next step matters: a 20-minute demo, overwritten live. Book the slot here — or on the GRID site.",
    demoTitle: "Book a demo",
    demoLead: "20 minutes. You see the template, the overwrite and the join code. No pitch deck.",
    sent: "Received. We’ll get back to you with a time.",
    name: "Name",
    company: "Company",
    email: "Work email",
    note: "Optional: when works, how many teams?",
    submit: "Request demo",
    sending: "Sending…",
  },
} as const;

function aboHref(
  lang: PlayUiLang,
  input: { teamName?: string; score?: string; resultsUrl?: string },
): string {
  const params = new URLSearchParams();
  if (input.teamName?.trim()) params.set("team", input.teamName.trim());
  if (input.score?.trim()) params.set("score", input.score.trim());
  if (input.resultsUrl) params.set("results", input.resultsUrl);
  params.set("lang", lang);
  return `/next/abo?${params.toString()}`;
}

export function GridAboNextPage({ language = "de", teamName, score, resultsUrl }: Props) {
  const t = COPY[language];
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
        language,
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
        <div className="flex items-start justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            {t.kicker}
          </p>
          <nav aria-label={language === "en" ? "Language" : "Sprache"} className="flex items-center gap-1">
            <a
              href={aboHref("de", { teamName, score, resultsUrl })}
              hrefLang="de"
              lang="de"
              aria-current={language === "de" ? "true" : undefined}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${
                language === "de" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              DE
            </a>
            <a
              href={aboHref("en", { teamName, score, resultsUrl })}
              hrefLang="en"
              lang="en"
              aria-current={language === "en" ? "true" : undefined}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${
                language === "en" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              EN
            </a>
          </nav>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{t.headline}</h1>
        {teamName ? (
          <p className="mt-3 text-base text-slate-600">
            {teamName}
            {score ? ` · ${score} ${t.points}` : null}
          </p>
        ) : null}

        {resultsUrl ? (
          <p className="mt-4">
            <a
              href={resultsUrl}
              className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
            >
              {t.recap}
            </a>
          </p>
        ) : null}

        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-slate-600">
          <p>{t.p1}</p>
          <ul className="list-disc space-y-2 ps-5">
            {t.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{t.p2}</p>
          <p>{t.p3}</p>
        </div>

        <section id="demo" className="mt-10 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <h2 className="text-xl font-bold">{t.demoTitle}</h2>
          <p className="mt-2 text-sm text-slate-500">{t.demoLead}</p>
          {sent ? (
            <p className="mt-5 text-sm font-semibold text-emerald-700">{t.sent}</p>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 grid gap-3">
              <input
                name="name"
                required
                placeholder={t.name}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none"
              />
              <input
                name="company"
                required
                placeholder={t.company}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none"
              />
              <input
                name="email"
                type="email"
                required
                placeholder={t.email}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none"
              />
              <textarea
                name="note"
                rows={3}
                placeholder={t.note}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none"
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={pending}
                className="rounded-2xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white disabled:opacity-50"
              >
                {pending ? t.sending : t.submit}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
