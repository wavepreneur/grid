import { CreateEventForm } from "@/components/admin/create-event-form";
import { GridShell } from "@/components/grid/grid-shell";

export default function AdminDevPage() {
  return (
    <GridShell
      eyebrow="GRID / DEV"
      title="Event erstellen"
      description="Temporärer Admin-Flow bis B2B-Auth existiert. Events nutzen das Template default-exitmania (10 Level)."
    >
      <CreateEventForm />
    </GridShell>
  );
}
