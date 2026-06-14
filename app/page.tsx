import Link from "next/link";
import { GridShell } from "@/components/grid/grid-shell";

export default function HomePage() {
  return (
    <GridShell
      title="Enterprise Experience OS"
      description="Phase 1: Zero-Auth Lobby & Team-Setup. Spieler brauchen keine Accounts — nur Event-Link und optional Team-Code."
    >
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/dev"
          className="grid-button inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
        >
          Dev: Event erstellen
        </Link>
        <p className="text-xs leading-6 text-[var(--grid-muted)]">
          Architektur-Hinweise: Event-Link (`invite_code`) für den Einstieg,
          Teammate-Link (`?team=join_code`) für Mitspieler, Analytics später in{" "}
          <code className="text-[var(--grid-accent)]">interaction_logs</code>.
        </p>
      </div>
    </GridShell>
  );
}
