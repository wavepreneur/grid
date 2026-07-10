import Link from "next/link";
import { StudioPage } from "@/components/cms/studio-page";
import { StudioPanel } from "@/components/cms/admin-shell";
import { ProductNav } from "@/components/platform/product-nav";
import { IconArrowRight } from "@/components/cms/studio-icons";

export default function DataHomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <ProductNav active="data" />
        <header className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
            GRID Data
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Team Intelligence</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Auswertungen, Vergleiche und Insights aus Live-Spielen — Filter, Gegenüberstellungen
            und KPIs für Kunden, die GRID buchen. Dieses Modul wird als nächstes aufgebaut.
          </p>
        </header>

        <StudioPanel className="mt-8 border-slate-800 bg-slate-900 text-slate-100">
          <h2 className="text-lg font-semibold">Geplant</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>· Event- und Team-Performance über Zeit</li>
            <li>· Aufgaben-Schwierigkeit &amp; Abbruchpunkte</li>
            <li>· Hinweis-Nutzung vs. Erfolgsquote</li>
            <li>· Export &amp; Benchmarks zwischen Städten / Spielen</li>
          </ul>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-teal-400 hover:text-teal-300"
          >
            Zurück zu Studio <IconArrowRight size={14} />
          </Link>
        </StudioPanel>
      </div>
    </div>
  );
}
