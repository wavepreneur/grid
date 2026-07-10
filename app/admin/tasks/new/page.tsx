import { StudioPage } from "@/components/cms/studio-page";
import { TaskEditor } from "@/components/cms/tasks/task-editor";

export default function NewTaskPage() {
  return (
    <StudioPage
      activePath="/admin/tasks"
      title="Neue Aufgabe"
      description="Erstelle ein Rätsel für die Bibliothek — die Vorschau rechts zeigt, wie es für Spieler aussieht."
    >
      <TaskEditor />
    </StudioPage>
  );
}
