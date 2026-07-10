import { CreateEventForm } from "@/components/admin/create-event-form";
import { ManageEventForm } from "@/components/admin/manage-event-form";
import { StudioPage } from "@/components/cms/studio-page";
import { StudioPanel } from "@/components/cms/admin-shell";

export default function AdminDevPage() {
  return (
    <StudioPage
      title="Entwicklung"
      description="Nur für Entwickler. Event-Leiter nutzen das Operator-Cockpit unter /cockpit/INVITECODE — ohne JSON, ohne Support."
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <StudioPanel>
          <h2 className="mb-6 text-xl font-semibold text-slate-900">Event erstellen</h2>
          <CreateEventForm />
        </StudioPanel>

        <StudioPanel>
          <h2 className="mb-2 text-xl font-semibold text-slate-900">Event verwalten</h2>
          <p className="mb-6 text-sm leading-7 text-slate-500">
            Invite-Code eingeben, GPS-Testmodus aktivieren oder Level per JSON überschreiben.
          </p>
          <ManageEventForm />
        </StudioPanel>
      </div>
    </StudioPage>
  );
}
