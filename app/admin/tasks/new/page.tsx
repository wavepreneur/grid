import { StudioPage } from "@/components/cms/studio-page";
import { TaskEditor } from "@/components/cms/tasks/task-editor";

export default function NewTaskPage() {
  return (
    <StudioPage
      activePath="/admin/tasks"
      title="Neuer Task"
      description="Standardisierter Aufbau: Kachel, Medien, Frage — Live-Preview rechts."
    >
      <TaskEditor />
    </StudioPage>
  );
}
