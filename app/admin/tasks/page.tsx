import Link from "next/link";
import { Suspense } from "react";
import { StudioPage } from "@/components/cms/studio-page";
import { TaskLibrary } from "@/components/cms/tasks/task-library";
import { listTasks } from "@/app/actions/cms/tasks";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";

export default async function AdminTasksPage() {
  const orgId = await getStudioOrganizationId();
  const result = await listTasks({ organizationId: orgId });
  const tasks = result.success ? result.data! : [];

  return (
    <StudioPage
      activePath="/admin/tasks"
      title="Tasks"
      description="Rätsel-Bibliothek — unabhängig von Games. Filter nach Stadt, Sprache, Typ. Später in Games kopieren."
      actions={
        <Link
          href="/admin/tasks/new"
          className="inline-flex rounded-xl border border-[var(--grid-accent)]/40 bg-[var(--grid-accent-soft)] px-4 py-2 text-sm font-medium text-[var(--grid-accent)]"
        >
          + Task erstellen
        </Link>
      }
    >
      <Suspense fallback={<p className="text-sm text-[var(--grid-muted)]">Lade Tasks…</p>}>
        <TaskLibrary tasks={tasks} />
      </Suspense>
    </StudioPage>
  );
}
