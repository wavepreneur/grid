import { Suspense } from "react";
import { StudioPage } from "@/components/cms/studio-page";
import { TaskLibrary } from "@/components/cms/tasks/task-library";
import { StudioLinkButton } from "@/components/cms/studio-ui";
import { IconPlus } from "@/components/cms/studio-icons";
import { getTasksGameUsage } from "@/app/actions/cms/delete";
import { listTasks } from "@/app/actions/cms/tasks";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";

export default async function AdminTasksPage() {
  const orgId = await getStudioOrganizationId();
  const result = await listTasks({ organizationId: orgId });
  const tasks = result.success ? result.data! : [];
  const metaResult = await getTasksGameUsage(tasks.map((t) => t.id));
  const usageByTask = new Map(
    (metaResult.success ? metaResult.data! : []).map((u) => [u.taskId, u]),
  );
  const tasksWithLive = tasks.map((task) => {
    const usage = usageByTask.get(task.id);
    return {
      ...task,
      liveGameCount: usage?.liveGameCount ?? 0,
      gameLinkCount: usage?.totalGameCount ?? 0,
    };
  });

  return (
    <StudioPage
      activePath="/admin/tasks"
      title="Aufgaben"
      description="Deine Rätsel-Bibliothek — unabhängig von Spielen. Suche, Tags und Live-Status."
      actions={
        <StudioLinkButton href="/admin/tasks/new" icon={<IconPlus size={16} />}>
          Neue Aufgabe
        </StudioLinkButton>
      }
    >
      <Suspense fallback={<p className="text-sm text-slate-500">Lade Aufgaben…</p>}>
        <TaskLibrary tasks={tasksWithLive} />
      </Suspense>
    </StudioPage>
  );
}
