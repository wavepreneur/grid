import { StudioPage } from "@/components/cms/studio-page";
import { TaskEditor } from "@/components/cms/tasks/task-editor";

export default function NewTaskPage() {
  return (
    <StudioPage
      activePath="/admin/tasks"
      title="Neue Aufgabe"
      description="Universelle Rätsel für die Bibliothek — Struktur wie im Spiel: Titelbild, Story, Kacheln, Frage & Antwort."
    >
      <TaskEditor />
    </StudioPage>
  );
}
