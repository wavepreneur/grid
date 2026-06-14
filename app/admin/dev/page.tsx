import { CreateEventForm } from "@/components/admin/create-event-form";
import { GridShell } from "@/components/grid/grid-shell";

export default function AdminDevPage() {
  return (
    <GridShell
      eyebrow="GRID / DEV"
      title="Event erstellen"
      description="Temporärer Admin-Flow bis B2B-Auth existiert. Erzeugt ein Event mit globalem invite_code."
    >
      <CreateEventForm />
    </GridShell>
  );
}
