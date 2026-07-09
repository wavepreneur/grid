import Link from "next/link";
import { StudioPage } from "@/components/cms/studio-page";
import { StudioPanel } from "@/components/cms/admin-shell";
import { getStudioDashboardStats } from "@/app/actions/cms/tickets";

export default async function AdminOverviewPage() {
  const statsResult = await getStudioDashboardStats();
  const stats = statsResult.success
    ? statsResult.data!
    : { tasks: 0, games: 0, templates: 0, activePools: 0, totalActivations: 0 };

  return (
    <StudioPage
      activePath="/admin"
      title="Overview"
      description="GRID Studio — Content, Templates und Tickets getrennt von laufenden Live-Events. Skaliert auf tausende Teams mit synchronisierter Runtime & Cockpit-Daten."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Tasks" value={stats.tasks} href="/admin/tasks" />
        <MetricCard label="Games" value={stats.games} href="/admin/games" />
        <MetricCard label="Templates" value={stats.templates} href="/admin/templates" />
        <MetricCard label="Aktive Pools" value={stats.activePools} href="/admin/tickets" />
        <MetricCard label="Aktivierungen" value={stats.totalActivations} href="/admin/tickets" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <StudioPanel>
          <h2 className="text-lg font-semibold text-white">Architektur</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--grid-muted)]">
            <li>
              <strong className="text-white">Game (Draft)</strong> — editierbar, jederzeit
            </li>
            <li>
              <strong className="text-white">Version (Publish)</strong> — eingefrorener Snapshot
            </li>
            <li>
              <strong className="text-white">Event (Live)</strong> — Multiplayer, Rollen, Sync, Telemetry
            </li>
            <li>
              Push-to-Live nur manuell — nie automatisch in laufende Events
            </li>
          </ul>
        </StudioPanel>
        <StudioPanel>
          <h2 className="text-lg font-semibold text-white">Skalierung</h2>
          <p className="mt-4 text-sm leading-6 text-[var(--grid-muted)]">
            Engine-Ziel: 10.000+ Teams × 4–5 Spieler — Realtime-Sync, Alpha/Beta/Gamma-Rollen,
            domain telemetry &amp; Operator-Cockpit. CMS provisioniert Inhalte; Runtime bleibt in GRID.
          </p>
        </StudioPanel>
      </div>
    </StudioPage>
  );
}

function MetricCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="grid-panel rounded-2xl p-5 transition hover:border-[var(--grid-accent)]/40"
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--grid-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </Link>
  );
}
