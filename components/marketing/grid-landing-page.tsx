import Link from "next/link";

type Maturity = "live" | "beta" | "vision";

const maturityLabel: Record<Maturity, string> = {
  live: "Live",
  beta: "In Arbeit",
  vision: "Vision",
};

const maturityClass: Record<Maturity, string> = {
  live: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  beta: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  vision: "border-[var(--grid-border)] bg-black/20 text-[var(--grid-muted)]",
};

function MaturityBadge({ status }: { status: Maturity }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${maturityClass[status]}`}
    >
      {maturityLabel[status]}
    </span>
  );
}

const problems = [
  {
    title: "Die App-Store-Barriere",
    text: "„Ladet euch bitte alle vorab App X herunter.“ Die Realität: Passwörter vergessen, kein Datenvolumen, IT blockiert den Download. Das Event beginnt mit Frust und technischem Support.",
  },
  {
    title: "Das Isolations-Paradoxon",
    text: "Selbst wenn Apps laufen, starrt jeder isoliert auf sein Display. Man läuft nebeneinanderher — parallele Bildschirmzeit statt echter Zusammenarbeit.",
  },
  {
    title: "Der Vorbereitungs-Overhead",
    text: "Maßgeschneiderte Events kosten Wochen Planung, komplexe Entwicklung oder ein Budget für externe Agenturen.",
  },
];

const steps = [
  {
    step: "01",
    title: "Der Canva-Effekt",
    subtitle: "Inhalte einpflegen",
    text: "Wähle eine Interaktions-Blaupause. Lade PDFs, Fragen oder Seminarunterlagen hoch — und platziere Inhalte so einfach wie in Canva.",
    status: "vision" as Maturity,
  },
  {
    step: "02",
    title: "Das Zauberei-Setup",
    subtitle: "Verteilen",
    text: "Für 10 Personen oder 100.000 Mitarbeiter: Event anlegen, zentralen Zugang generieren, Teams und Rollen vorbereiten.",
    status: "beta" as Maturity,
  },
  {
    step: "03",
    title: "Scan & Play",
    subtitle: "Echtzeit-Synchronisation",
    text: "QR-Code scannen oder Link öffnen, Namen tippen, sofort im Team. Self-Healing UX: Refresh genügt — kein Neustart, kein Support.",
    status: "live" as Maturity,
  },
];

const features = [
  {
    icon: "⚡",
    title: "Zero-Friction UX",
    text: "100 % browserbasiert. iOS, Android, Windows, Mac. Keine Downloads — maximale Conversion vor Ort.",
    status: "live" as Maturity,
  },
  {
    icon: "🧠",
    title: "Asymmetrischer Realtime-Sync",
    text: "Informationen verteilen sich ungleich auf Team-Screens: Karte, Rätsel, Eingabe — das zwingt zum Gespräch.",
    status: "beta" as Maturity,
  },
  {
    icon: "🗺️",
    title: "Hybride Flexibilität",
    text: "Indoor-Quiz im Seminarraum oder GPS-Escape quer durch die City — ein Engine-Blueprint, viele Module.",
    status: "live" as Maturity,
  },
  {
    icon: "📊",
    title: "Smarter HR-Ergebnisreport",
    text: "Nach dem Event: Team-DNA, Kommunikationsmuster, Rollenverteilungen — datenbasiert statt reiner Highscore-Liste.",
    status: "vision" as Maturity,
  },
];

const useCases = [
  {
    icon: "🏢",
    title: "Corporate Teambuilding",
    text: "Remote- und Hybrid-Teams in Rekordzeit zusammenschweißen — ohne tagelange Logistik-Schleifen.",
  },
  {
    icon: "🚀",
    title: "New Hire Onboarding",
    text: "Gelände, Kultur und Kollegen als interaktive, selbstgesteuerte Smartphone-Rallye.",
  },
  {
    icon: "🎓",
    title: "Trainings & Seminare",
    text: "PowerPoint durch Interaktion ersetzen. Trainer füllen die Engine — Teilnehmer erleben ein Seminar, das hängen bleibt.",
  },
  {
    icon: "🌍",
    title: "Globale All-Hands",
    text: "Tausende Mitarbeiter simultan verbinden — Fraktionen schalten über Live-Votings gemeinsame Ziele frei.",
  },
];

const goalTracker = [
  { claim: "Zero-Auth: Link + Name, sofort im Team", status: "live" as Maturity },
  { claim: "Self-Healing Sessions & Gerätewechsel", status: "live" as Maturity },
  { claim: "Echtzeit-Sync (Spielstand, Lobby, Rollen)", status: "live" as Maturity },
  { claim: "Asymmetrische Rollen (Captain, GPS, Mitspieler)", status: "live" as Maturity },
  { claim: "Exitmania-Modul: Kacheln, Tipps, GPS-Karte", status: "live" as Maturity },
  { claim: "Operator-Cockpit & Beamer-Live-Score", status: "live" as Maturity },
  { claim: "Booking-API & Event-Provisioning", status: "beta" as Maturity },
  { claim: "Canva-Style CMS & KI-Content-Import", status: "vision" as Maturity },
  { claim: "HR Analytics & Team-DNA Dashboard", status: "vision" as Maturity },
  { claim: "Globale All-Hands / Live-Voting Module", status: "vision" as Maturity },
];

export function GridLandingPage() {
  return (
    <div className="grid-bg min-h-screen text-white">
      <header className="sticky top-0 z-50 border-b border-[var(--grid-border)] bg-[#030712]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--grid-accent)]">
              GRID
            </p>
            <p className="text-sm text-[var(--grid-muted)]">Enterprise Experience OS</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="#ziel-tracker"
              className="hidden text-sm text-[var(--grid-muted)] hover:text-white sm:inline"
            >
              Produkt-Stand
            </Link>
            <Link
              href="/admin/dev"
              className="grid-button rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
            >
              Event starten
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-[var(--grid-border)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(46,233,218,0.14),transparent_55%)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--grid-accent)]">
              Zero-Ops Multiplayer-Infrastruktur
            </p>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]">
              Bringe jede Gruppe in 60 Sekunden in ein synchronisiertes Team-Erlebnis.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--grid-muted)] sm:text-lg">
              Keine App-Downloads. Keine Logins. Keine IT-Freigaben. Ein einziger QR-Code
              verwandelt Smartphones und PCs in ein interaktives Team-Cockpit — skalierbar von 2
              bis 100.000 Personen.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/admin/dev"
                className="grid-button inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold"
              >
                Jetzt erstes Event kostenlos starten
              </Link>
              <p className="text-xs text-[var(--grid-muted)]">
                Pilot über Dev-Dashboard · Self-Service folgt
              </p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["60s", "Onboarding"],
                ["0", "App-Downloads"],
                ["100%", "Browser"],
                ["∞", "Geräte-Sync"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--grid-border)] bg-black/20 px-4 py-4"
                >
                  <p className="text-2xl font-semibold text-[var(--grid-accent)]">{value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--grid-muted)]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-[var(--grid-border)] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-300/80">
              Das Problem
            </p>
            <h2 className="mt-3 max-w-3xl text-2xl font-semibold sm:text-3xl">
              Warum moderne Gruppen-Events ein logistischer Albtraum sind
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {problems.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[var(--grid-border)] bg-black/20 p-5 sm:p-6"
                >
                  <h3 className="text-lg font-medium text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--grid-muted)]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Solution */}
        <section className="border-b border-[var(--grid-border)] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--grid-accent)]">
              Die Lösung
            </p>
            <h2 className="mt-3 max-w-3xl text-2xl font-semibold sm:text-3xl">
              Schluss mit technischer Reibung. GRID ist die Zero-Ops-Infrastruktur für echte
              Interaktion.
            </h2>
            <p className="mt-6 max-w-3xl text-sm leading-8 text-[var(--grid-muted)] sm:text-base">
              GRID eliminiert die Technik-Hürde komplett. Es bringt das simple Onboarding von
              Kahoot in die echte Welt und verbindet Geräte im Raum oder über Kontinente hinweg in
              Millisekunden-Echtzeit. Smartphones verhalten sich nicht mehr wie isolierte
              Bildschirme, sondern wie Knöpfe und Anzeigen in einem gemeinsamen
              Raumschiff-Cockpit.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b border-[var(--grid-border)] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--grid-muted)]">
              How it works
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">So funktioniert GRID</h2>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {steps.map((item) => (
                <article
                  key={item.step}
                  className="flex flex-col rounded-2xl border border-[var(--grid-border)] bg-black/20 p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold tracking-[0.2em] text-[var(--grid-accent)]">
                      Schritt {item.step}
                    </span>
                    <MaturityBadge status={item.status} />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-[var(--grid-accent)]">{item.subtitle}</p>
                  <p className="mt-4 flex-1 text-sm leading-7 text-[var(--grid-muted)]">
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-[var(--grid-border)] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--grid-muted)]">
              Key Features
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Die GRID Secret Sauce</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {features.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[var(--grid-border)] bg-black/20 p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-2xl" aria-hidden>
                      {item.icon}
                    </span>
                    <MaturityBadge status={item.status} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--grid-muted)]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="border-b border-[var(--grid-border)] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--grid-muted)]">
              Use Cases
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Wo GRID gewinnt</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {useCases.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[var(--grid-border)] bg-[var(--grid-accent-soft)]/30 p-6"
                >
                  <span className="text-2xl" aria-hidden>
                    {item.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--grid-muted)]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Goal tracker — north star for development */}
        <section id="ziel-tracker" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-3xl border border-[var(--grid-border)] bg-black/30 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--grid-accent)]">
                Ziel-Tracker
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Marketing-Versprechen vs. Produkt-Stand
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--grid-muted)]">
                Diese Seite ist unser Kompass: Was wir versprechen, was schon live ist und was
                als Nächstes gebaut wird. Badges aktualisieren wir mit jedem Release.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--grid-muted)]">
                <span className="inline-flex items-center gap-2">
                  <MaturityBadge status="live" /> Produktiv nutzbar
                </span>
                <span className="inline-flex items-center gap-2">
                  <MaturityBadge status="beta" /> Teilweise / Pilot
                </span>
                <span className="inline-flex items-center gap-2">
                  <MaturityBadge status="vision" /> Noch nicht gebaut
                </span>
              </div>
              <ul className="mt-8 divide-y divide-[var(--grid-border)]">
                {goalTracker.map((item) => (
                  <li
                    key={item.claim}
                    className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm text-white">{item.claim}</span>
                    <MaturityBadge status={item.status} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-[var(--grid-border)] py-16">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Bereit für dein erstes synchronisiertes Team-Erlebnis?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--grid-muted)]">
              Starte ein Pilot-Event, lade dein Team per QR ein und erlebe Zero-Auth Multiplayer
              in unter einer Minute.
            </p>
            <Link
              href="/admin/dev"
              className="grid-button mx-auto mt-8 inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold"
            >
              Jetzt erstes Event kostenlos starten
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--grid-border)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-[var(--grid-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© GRID · Enterprise Experience OS</p>
          <div className="flex gap-4">
            <Link href="/admin/dev" className="hover:text-white">
              Dev-Dashboard
            </Link>
            <span>gridos.vercel.app</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
