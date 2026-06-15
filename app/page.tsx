import Link from "next/link";
import { GridShell } from "@/components/grid/grid-shell";

export default function HomePage() {
  return (
    <GridShell
      title="Enterprise Experience OS"
      description="Zero-Auth Multiplayer für Teams und Events. Ein Link, ein Name — sofort dabei."
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-7 text-[var(--grid-muted)]">
          Spieler starten unter <code className="text-[var(--grid-accent)]">/e/EVENTCODE</code>.
          Event-Leiter steuern unter{" "}
          <code className="text-emerald-300">/cockpit/EVENTCODE</code>.
        </p>
        <Link
          href="/admin/dev"
          className="grid-button inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-[var(--grid-muted)]"
        >
          Dev: Events anlegen (intern)
        </Link>
      </div>
    </GridShell>
  );
}
