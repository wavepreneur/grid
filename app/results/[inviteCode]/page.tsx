export const dynamic = "force-dynamic";

export default function PublicEventResultsClosedPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f7f6f0] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-800">
          Event-Ergebnisse
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Nicht öffentlich</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Ein Team sieht nur den eigenen Stand im Spiel. Alle Teams sieht nur, wer das Event gebucht
          hat — im Event-Cockpit.
        </p>
      </div>
    </main>
  );
}
