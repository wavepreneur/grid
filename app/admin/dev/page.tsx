import { CreateEventForm } from "@/components/admin/create-event-form";
import { ManageEventForm } from "@/components/admin/manage-event-form";

export default function AdminDevPage() {
  return (
    <div className="grid-bg min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--grid-accent)]">
            GRID / DEV
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Admin</h1>
          <p className="text-sm leading-7 text-[var(--grid-muted)]">
            Nur für Entwickler. Event-Leiter nutzen das{" "}
            <strong className="text-emerald-300">Operator-Cockpit</strong> unter{" "}
            <code>/cockpit/INVITECODE</code> — ohne JSON, ohne Support.
          </p>
        </header>

        <section className="grid-panel p-8 sm:p-10">
          <h2 className="mb-6 text-xl font-semibold text-white">Event erstellen</h2>
          <CreateEventForm />
        </section>

        <section className="grid-panel p-8 sm:p-10">
          <h2 className="mb-2 text-xl font-semibold text-white">Event verwalten</h2>
          <p className="mb-6 text-sm leading-7 text-[var(--grid-muted)]">
            Invite-Code eingeben, GPS-Testmodus aktivieren oder Level per JSON überschreiben.
          </p>
          <ManageEventForm />
        </section>
      </div>
    </div>
  );
}
