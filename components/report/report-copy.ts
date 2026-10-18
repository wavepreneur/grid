import type { ReportTier } from "@/components/report/report-tiers";

export const REPORT_LANGS = ["en", "de", "fr", "es", "it"] as const;
export type ReportLang = (typeof REPORT_LANGS)[number];

type Tell = { happened: string; matters: string; action: string };
/** `counted`: teams with at least 5 people. `teams`: all teams (role data is session-wide). */
type TellContext = { wrong: number; counted: number; teams: number };
/** `whenTeamevent`: Exitmania customers don't run "sessions", they book teamevents. */
type NextStep = { action: string; when: string; whenTeamevent?: string; needsContent: boolean };

const en = {
  locale: "en-GB",
  demo: {
    back: "Back to Tells",
    example: "Example report",
    book: "Book a session",
    preview: "Preview",
    tiers: { light: "Light", session: "Session", year: "Yearly plan" } as Record<ReportTier, string>,
    print: "Save as PDF",
    /** Example task titles. Real titles come from the customer's own content. */
    taskTitles: {} as Record<string, string>,
  },
  header: {
    tier: {
      light: "Light report · Exitmania teamevent",
      session: "Session report",
      year: "Team report · Yearly plan",
    } as Record<ReportTier, string>,
    minutes: (n: number) => `${n} min`,
    teams: (n: number) => `${n} teams`,
    players: (n: number) => `${n} players`,
    game: (name: string) => `Game: ${name}`,
    logo: "Your logo",
    privacy: "Team-level insights only. No individual is scored.",
  },
  summary: {
    scoreLabel: "Average team score",
    outOf: "of 100",
    strip: (low: number, high: number, avg: number) =>
      `Team scores from ${low} to ${high}, average ${avg}`,
    verdict: {
      light: "Good teamwork. One handoff slowed every team.",
      session: "Solid start. One topic didn't land.",
      year: "Solid start. One topic didn't land.",
    } as Record<ReportTier, string>,
    tellsTitle: (n: number) => (n === 1 ? "The one thing that matters" : `The ${n} things that matter`),
    happened: "What happened",
    matters: "Why it matters",
    action: "Do this",
    tells: (c: TellContext): Tell[] => [
      {
        happened: `Task 4, discount policy: ${c.wrong} of ${c.counted} teams answered wrong.`,
        matters: "The topic was not understood.",
        action: "Re-explain the policy. Re-run Task 4 in 2 weeks.",
      },
      {
        happened: `The Gamma role waited 48 s for input, on average across ${c.teams} teams.`,
        matters: "Handoffs stall. The team waits instead of working.",
        action: "Make task ownership explicit.",
      },
      {
        happened: "Teams that passed tasks on solved 31 % faster.",
        matters: "Splitting work pays off.",
        action: "Encourage teams to split work.",
      },
    ],
    lockedLight:
      "With your own content in the game, this report also shows which of your topics didn't land.",
    lockedLightCta: "Run a session with your content",
  },
  nextSteps: {
    title: "Next steps",
    lede: "Do these before the next session.",
    ledeTeamevent: "Do these before the next teamevent.",
    items: [
      { action: "Re-explain the discount policy, then re-run Task 4.", when: "In 2 weeks", needsContent: true },
      {
        action: "Name one owner per task, so the Gamma role isn't left waiting.",
        when: "Before the next session",
        whenTeamevent: "Before the next teamevent",
        needsContent: false,
      },
      {
        action: "Ask teams to split the tasks up front.",
        when: "Next session",
        whenTeamevent: "At the next teamevent",
        needsContent: false,
      },
    ] as NextStep[],
  },
  collaboration: {
    title: "How teams worked together",
    lede: "Averages across all teams. No person is shown.",
    seconds: (s: number) => `${s} s`,
    wait: {
      title: "Waiting time per role",
      average: (s: number) => `Team average ${s} s`,
      sentence: (role: string, s: number, avg: number) =>
        `${role} waited longest: ${s} s for input, against a team average of ${avg} s.`,
    },
    handoffs: {
      title: "Handoffs between roles",
      unit: "per team",
      sentence: (from: string, to: string, n: number) =>
        `Work rarely moved from ${from} to ${to}: ${n} handoffs per team.`,
    },
    hints: {
      title: "Hints bought",
      task: (n: string) => `Task ${n}`,
      other: "Other tasks",
      sentence: (on: number, total: number, task: string) => `${on} of ${total} hints went to ${task}.`,
    },
  },
  comparison: {
    title: "Team comparison",
    lede: "Ranked by score, with what made the difference for each team.",
    yours: "Your teams",
    benchmark: "Tells average for this game",
    rank: (n: number) => `Rank ${n}`,
    players: (n: number) => `${n} players`,
    task: (n: string) => `Task ${n}`,
    drivers: {
      solvedTask: (task: string) => `Solved ${task}`,
      missedTask: (task: string) => `Didn't solve ${task}`,
      mostHandoffs: "Passed tasks on most often",
      fewestHandoffs: "Fewest handoffs",
      noHints: "No hints needed",
      hints: (n: number) => (n === 1 ? "1 hint bought" : `${n} hints bought`),
    },
  },
  overTime: {
    title: "Over time",
    lede: (team: string) => `Team ${team}, score per session.`,
    session: (n: number) => `S${n}`,
    reorg: "Reorg",
    sentence: (team: string, from: number, to: number, n: number) =>
      `${team} went from ${from} to ${to} over ${n} sessions.`,
    reorgNote: "The dip came with the reorg.",
    chartLabel: (team: string, points: string) => `Team ${team}, scores per session: ${points}`,
    empty: "Run the next session to see a trend.",
    emptyCta: "Plan the next session",
    lockedBadge: "Yearly plan",
    locked: "Shows how your teams develop from session to session. This needs a yearly plan.",
    lockedCta: "See yearly plans",
  },
  method: {
    title: "Method & privacy",
    lede: "For works councils and data protection officers: what this report is based on, and what it leaves out.",
    measuredTitle: "What Tells measures, per team",
    measured: [
      "Right and wrong answers, and the kind of wrong answer",
      "Time per task",
      "Waiting time between roles",
      "Hints bought",
      "Tasks passed on within the team",
      "Text answers, analysed by AI",
    ],
    notMeasuredTitle: "What Tells does not do",
    notMeasured: [
      "Score, rank or profile any single person",
      "Show player names or who answered what",
      "Show role data for a single team",
      "Measure anything outside the game",
    ],
    rolesLabel: "Roles",
    roles:
      "The system hands out roles on joining, in a fixed order: Alpha, Beta, Gamma, Delta. A role says nothing about the person holding it. Role data is only shown as an average across teams.",
    aiLabel: "AI text analysis",
    ai: "Text answers are analysed by AI to find what a team misunderstood. Results are only shown per team, never per person.",
    minGroupLabel: "Minimum group size",
    minGroup:
      "Any breakdown with fewer than 5 people is hidden. Teams with fewer than 5 people are left out of all totals; only their score and rank are shown.",
    retentionLabel: "Retention",
    dataLabel: "Your data",
    data: {
      light: "Team-level results stay available in this report.",
      session: "Team-level results stay available in this report.",
      year: "Team-level raw data can be exported as CSV at any time, including when you cancel.",
    } as Record<ReportTier, string>,
    contactLabel: "Contact",
    placeholder: "To be confirmed",
  },
  print: {
    footer: "Generated by Tells · Team-level insights only",
  },
  states: {
    loading: "Loading report",
    processingTitle: "Your report is being prepared",
    processing: "Ready seconds after the last task. This page updates by itself.",
    errorTitle: "This report could not be loaded",
    error: "Your results are safe. Try again in a moment.",
    retry: "Try again",
  },
  privacy: {
    hidden: "Hidden to protect privacy (fewer than 5 people).",
    excluded: (n: number) =>
      n === 1
        ? "1 team with fewer than 5 people is not counted in these totals."
        : `${n} teams with fewer than 5 people are not counted in these totals.`,
  },
  understanding: {
    title: "Understanding by task",
    lede: (task: string, correct: number, total: number) =>
      `Most topics landed. “${task}” did not: ${correct} of ${total} teams got it right.`,
    teamsCorrect: (correct: number, total: number) => `${correct} of ${total} teams`,
    weakest: "Weakest",
  },
  locked: {
    badge: "Session and yearly plan",
    understanding:
      "Shows which of your topics each team understood. This needs your own content in the game.",
    cta: "Run a session with your content",
  },
};

export type ReportCopy = typeof en;

const de: ReportCopy = {
  locale: "de-DE",
  demo: {
    back: "Zurück zu Tells",
    example: "Beispiel-Report",
    book: "Session buchen",
    preview: "Vorschau",
    tiers: { light: "Light", session: "Session", year: "Jahresplan" },
    print: "Als PDF speichern",
    taskTitles: {
      T1: "Unsere Werte",
      T2: "Produktgrundlagen",
      T3: "Wen fragen",
      T4: "Rabattregel",
      T5: "Tools",
      T6: "Erste Woche",
    },
  },
  header: {
    tier: {
      light: "Light-Report · Exitmania-Teamevent",
      session: "Session-Report",
      year: "Team-Report · Jahresplan",
    },
    minutes: (n) => `${n} Min.`,
    teams: (n) => `${n} Teams`,
    players: (n) => `${n} Spielende`,
    game: (name) => `Spiel: ${name}`,
    logo: "Ihr Logo",
    privacy: "Nur Erkenntnisse auf Teamebene. Keine Person wird bewertet.",
  },
  summary: {
    scoreLabel: "Durchschnittlicher Team-Score",
    outOf: "von 100",
    strip: (low, high, avg) => `Team-Scores von ${low} bis ${high}, Durchschnitt ${avg}`,
    verdict: {
      light: "Gute Zusammenarbeit. Eine Übergabe hat jedes Team gebremst.",
      session: "Solider Start. Ein Thema ist nicht angekommen.",
      year: "Solider Start. Ein Thema ist nicht angekommen.",
    },
    tellsTitle: (n) => (n === 1 ? "Das eine, was zählt" : `Die ${n} Dinge, die zählen`),
    happened: "Was passiert ist",
    matters: "Warum es wichtig ist",
    action: "Das tun Sie",
    tells: (c) => [
      {
        happened: `Aufgabe 4, Rabattregel: ${c.wrong} von ${c.counted} Teams haben falsch geantwortet.`,
        matters: "Das Thema wurde nicht verstanden.",
        action: "Regel neu erklären. Aufgabe 4 in 2 Wochen erneut spielen.",
      },
      {
        happened: `Die Gamma-Rolle hat im Schnitt 48 s auf Input gewartet, über alle ${c.teams} Teams.`,
        matters: "Übergaben stocken. Das Team wartet, statt zu arbeiten.",
        action: "Zuständigkeiten für Aufgaben klar festlegen.",
      },
      {
        happened: "Teams, die Aufgaben weitergegeben haben, waren 31 % schneller.",
        matters: "Arbeit aufzuteilen zahlt sich aus.",
        action: "Teams ermutigen, Arbeit aufzuteilen.",
      },
    ],
    lockedLight:
      "Mit Ihren eigenen Inhalten im Spiel zeigt dieser Report auch, welche Ihrer Themen nicht angekommen sind.",
    lockedLightCta: "Session mit eigenen Inhalten starten",
  },
  nextSteps: {
    title: "Nächste Schritte",
    lede: "Vor der nächsten Session erledigen.",
    ledeTeamevent: "Vor dem nächsten Teamevent erledigen.",
    items: [
      { action: "Rabattregel neu erklären, dann Aufgabe 4 erneut spielen.", when: "In 2 Wochen", needsContent: true },
      {
        action: "Pro Aufgabe eine zuständige Rolle festlegen, damit Gamma nicht wartet.",
        when: "Vor der nächsten Session",
        whenTeamevent: "Vor dem nächsten Teamevent",
        needsContent: false,
      },
      {
        action: "Teams bitten, die Aufgaben gleich zu Beginn aufzuteilen.",
        when: "Nächste Session",
        whenTeamevent: "Beim nächsten Teamevent",
        needsContent: false,
      },
    ],
  },
  collaboration: {
    title: "So haben die Teams zusammengearbeitet",
    lede: "Durchschnitt über alle Teams. Keine Person wird gezeigt.",
    seconds: (s) => `${s} s`,
    wait: {
      title: "Wartezeit pro Rolle",
      average: (s) => `Team-Schnitt ${s} s`,
      sentence: (role, s, avg) =>
        `${role} hat am längsten gewartet: ${s} s auf Input, bei einem Team-Schnitt von ${avg} s.`,
    },
    handoffs: {
      title: "Übergaben zwischen Rollen",
      unit: "pro Team",
      sentence: (from, to, n) => `Von ${from} zu ${to} ging selten Arbeit: ${n} Übergaben pro Team.`,
    },
    hints: {
      title: "Gekaufte Tipps",
      task: (n) => `Aufgabe ${n}`,
      other: "Andere Aufgaben",
      sentence: (on, total, task) => `${on} von ${total} Tipps gingen an ${task}.`,
    },
  },
  comparison: {
    title: "Teams im Vergleich",
    lede: "Nach Score sortiert, mit dem, was pro Team den Unterschied gemacht hat.",
    yours: "Ihre Teams",
    benchmark: "Tells-Schnitt für dieses Spiel",
    rank: (n) => `Platz ${n}`,
    players: (n) => `${n} Spielende`,
    task: (n) => `Aufgabe ${n}`,
    drivers: {
      solvedTask: (task) => `${task} gelöst`,
      missedTask: (task) => `${task} nicht gelöst`,
      mostHandoffs: "Am häufigsten Aufgaben weitergegeben",
      fewestHandoffs: "Wenigste Übergaben",
      noHints: "Ohne Tipps",
      hints: (n) => (n === 1 ? "1 Tipp gekauft" : `${n} Tipps gekauft`),
    },
  },
  overTime: {
    title: "Verlauf über Zeit",
    lede: (team) => `Team ${team}, Score pro Session.`,
    session: (n) => `S${n}`,
    reorg: "Umstrukturierung",
    sentence: (team, from, to, n) =>
      `${team} hat sich in ${n} Sessions von ${from} auf ${to} entwickelt.`,
    reorgNote: "Der Knick kam mit der Umstrukturierung.",
    chartLabel: (team, points) => `Team ${team}, Scores pro Session: ${points}`,
    empty: "Spielen Sie die nächste Session, um einen Verlauf zu sehen.",
    emptyCta: "Nächste Session planen",
    lockedBadge: "Jahresplan",
    locked: "Zeigt, wie sich Ihre Teams von Session zu Session entwickeln. Dafür braucht es einen Jahresplan.",
    lockedCta: "Jahrespläne ansehen",
  },
  method: {
    title: "Methode & Datenschutz",
    lede: "Für Betriebsrat und Datenschutz: worauf dieser Report beruht und was er bewusst weglässt.",
    measuredTitle: "Was Tells misst, pro Team",
    measured: [
      "Richtige und falsche Antworten, und die Art der falschen Antwort",
      "Zeit pro Aufgabe",
      "Wartezeit zwischen Rollen",
      "Gekaufte Tipps",
      "Im Team weitergegebene Aufgaben",
      "Textantworten, ausgewertet per KI",
    ],
    notMeasuredTitle: "Was Tells nicht tut",
    notMeasured: [
      "Einzelne Personen bewerten, ranken oder profilieren",
      "Namen von Spielenden zeigen oder wer was geantwortet hat",
      "Rollendaten für ein einzelnes Team zeigen",
      "Etwas außerhalb des Spiels messen",
    ],
    rolesLabel: "Rollen",
    roles:
      "Das System vergibt die Rollen beim Beitritt in fester Reihenfolge: Alpha, Beta, Gamma, Delta. Eine Rolle sagt nichts über die Person aus, die sie spielt. Rollendaten erscheinen nur als Durchschnitt über alle Teams.",
    aiLabel: "KI-Textanalyse",
    ai: "Textantworten werden per KI ausgewertet, um zu erkennen, was ein Team missverstanden hat. Ergebnisse erscheinen nur pro Team, nie pro Person.",
    minGroupLabel: "Mindestgruppe",
    minGroup:
      "Jede Aufschlüsselung mit weniger als 5 Personen wird ausgeblendet. Teams mit weniger als 5 Personen fließen in keine Summe ein; nur ihr Score und Platz werden gezeigt.",
    retentionLabel: "Aufbewahrung",
    dataLabel: "Ihre Daten",
    data: {
      light: "Ergebnisse auf Teamebene bleiben in diesem Report abrufbar.",
      session: "Ergebnisse auf Teamebene bleiben in diesem Report abrufbar.",
      year: "Rohdaten auf Teamebene lassen sich jederzeit als CSV exportieren, auch bei Kündigung.",
    },
    contactLabel: "Kontakt",
    placeholder: "Wird noch festgelegt",
  },
  print: {
    footer: "Erstellt mit Tells · Nur Erkenntnisse auf Teamebene",
  },
  states: {
    loading: "Report wird geladen",
    processingTitle: "Ihr Report wird erstellt",
    processing: "Fertig Sekunden nach der letzten Aufgabe. Diese Seite aktualisiert sich selbst.",
    errorTitle: "Dieser Report konnte nicht geladen werden",
    error: "Ihre Ergebnisse sind sicher. Bitte versuchen Sie es gleich noch einmal.",
    retry: "Erneut versuchen",
  },
  privacy: {
    hidden: "Ausgeblendet zum Schutz der Privatsphäre (weniger als 5 Personen).",
    excluded: (n) =>
      n === 1
        ? "1 Team mit weniger als 5 Personen ist in diesen Summen nicht enthalten."
        : `${n} Teams mit weniger als 5 Personen sind in diesen Summen nicht enthalten.`,
  },
  understanding: {
    title: "Verständnis pro Aufgabe",
    lede: (task, correct, total) =>
      `Die meisten Themen sind angekommen. „${task}“ nicht: ${correct} von ${total} Teams lagen richtig.`,
    teamsCorrect: (correct, total) => `${correct} von ${total} Teams`,
    weakest: "Am schwächsten",
  },
  locked: {
    badge: "Session und Jahresplan",
    understanding:
      "Zeigt, welche Ihrer Themen jedes Team verstanden hat. Dafür braucht es Ihre eigenen Inhalte im Spiel.",
    cta: "Session mit eigenen Inhalten starten",
  },
};

const COPY: Record<ReportLang, ReportCopy> = {
  en,
  de,
  // Same keys; English until translated.
  fr: { ...en, locale: "fr-FR" },
  es: { ...en, locale: "es-ES" },
  it: { ...en, locale: "it-IT" },
};

export function parseLang(value: string | string[] | undefined): ReportLang {
  return REPORT_LANGS.includes(value as ReportLang) ? (value as ReportLang) : "en";
}

export function reportCopy(lang: ReportLang): ReportCopy {
  return COPY[lang];
}
