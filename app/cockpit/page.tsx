import Link from "next/link";
import { ProductNav } from "@/components/platform/product-nav";

export default function CockpitIndexPage() {
  return (
    <div className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <ProductNav active="cockpit" />
          <header className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
              GRID Cockpit
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Live-Ops</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Das Cockpit öffnest du pro Live-Event über den Einladungscode — z. B.{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/cockpit/ABC123</code>.
              Dort steuerst du Teams, GPS-Overrides und siehst den Live-Stand.
            </p>
            <Link
              href="/admin/games"
              className="mt-6 inline-block text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              Spiele in Studio verwalten →
            </Link>
          </header>
        </div>
      </div>
  );
}
