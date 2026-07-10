"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upsertTask, type TaskUpsertInput } from "@/app/actions/cms/tasks";
import { TaskDeleteButton } from "@/components/cms/tasks/task-delete-button";
import { TaskDuplicateButton } from "@/components/cms/tasks/task-duplicate-button";
import { TaskEditorPreview } from "@/components/cms/tasks/task-editor-preview";
import { TaskScoringEditor, TaskTilesEditor } from "@/components/cms/tasks/task-tiles-editor";
import { ImageUploadField } from "@/components/cms/shared/image-upload-field";
import { StudioPanel } from "@/components/cms/admin-shell";
import { IconArrowRight, IconPlus, IconSave, IconTrash } from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSelect,
  StudioTextarea,
} from "@/components/cms/studio-ui";
import {
  createTaskOptionId,
  defaultTaskScoring,
  normalizeTaskContent,
} from "@/lib/cms/task-content";
import {
  DEFAULT_TASK_CONTENT,
  type StudioTask,
  type StudioTaskContent,
} from "@/lib/cms/types";

type Props = {
  task?: StudioTask;
  returnTo?: string;
};

export function TaskEditor({ task, returnTo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [tags, setTags] = useState((task?.tags ?? []).join(", "));
  const [content, setContent] = useState<StudioTaskContent>(() =>
    normalizeTaskContent(task?.content ?? DEFAULT_TASK_CONTENT),
  );

  const previewContent = useMemo(() => content, [content]);

  function patchContent(patch: Partial<StudioTaskContent>) {
    setContent((prev) => ({ ...prev, ...patch }));
  }

  function patchScoring(scoring: NonNullable<StudioTaskContent["scoring"]>) {
    patchContent({ scoring });
  }

  function addOption() {
    const options = [...(content.options ?? []), { id: createTaskOptionId(), label: "", correct: false }];
    patchContent({ options });
  }

  function patchOption(id: string, patch: Partial<{ label: string; correct: boolean }>) {
    patchContent({
      options: (content.options ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  }

  function removeOption(id: string) {
    patchContent({ options: (content.options ?? []).filter((o) => o.id !== id) });
  }

  function setSingleCorrect(id: string) {
    patchContent({
      options: (content.options ?? []).map((o) => ({ ...o, correct: o.id === id })),
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const payload: TaskUpsertInput = {
      id: task?.id,
      title,
      description,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      content: normalizeTaskContent(content),
    };

    startTransition(async () => {
      const result = await upsertTask(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(returnTo ?? `/admin/tasks/${result.data!.id}`);
      router.refresh();
    });
  }

  const scoring = content.scoring ?? defaultTaskScoring();

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {error ? <StudioError message={error} /> : null}

        <StudioPanel>
          <StudioSectionTitle
            title="Grunddaten"
            description="Universelle Aufgabe — Zuordnung zu Spiel & Layer passiert erst im Spiel-Editor."
          />
          <div className="space-y-4">
            <div>
              <StudioLabel>Titel</StudioLabel>
              <StudioInput value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <StudioLabel>Beschreibung</StudioLabel>
              <StudioTextarea
                className="min-h-28"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Story / Kontext — was der Spieler vor dem Rätsel liest"
              />
            </div>
            <ImageUploadField
              label="Titelbild"
              hint="Querformat empfohlen · wird oben in der Aufgabe angezeigt"
              value={content.hero_image_url ?? ""}
              onChange={(url) => patchContent({ hero_image_url: url || undefined })}
            />
            <div>
              <StudioLabel hint="Kommagetrennt — zum Filtern in der Bibliothek">Tags</StudioLabel>
              <StudioInput
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="berlin, mauer, outdoor, quiz…"
              />
            </div>
          </div>
        </StudioPanel>

        <StudioPanel>
          <StudioSectionTitle
            title="Punkte & Zeit"
            description="Belohnung, optionaler Countdown und Punkte-Verfall"
          />
          <TaskScoringEditor scoring={scoring} onChange={patchScoring} />
        </StudioPanel>

        <StudioPanel>
          <StudioSectionTitle
            title="Medien-Kacheln"
            description="Spieler tippt Kacheln an → Modal mit Bild, Video, Audio oder Webseite. Pro Kachel optional ein kaufbarer Hinweis zum Kachel-Inhalt."
          />
          <StudioHint tone="info">
            Pro Kachel ein Cover-Bild hochladen (1:1). Eine Kachel wird zentriert, zwei nebeneinander wie
            im Spiel.
          </StudioHint>
          <div className="mt-4">
            <TaskTilesEditor
              tiles={content.tiles ?? []}
              onChange={(tiles) => patchContent({ tiles })}
            />
          </div>
        </StudioPanel>

        <StudioPanel>
          <StudioSectionTitle title="Frage & Antwort" description="Lösung am Ende der Aufgabe" />
          <div className="space-y-4">
            <div>
              <StudioLabel>Frage</StudioLabel>
              <StudioInput
                value={content.question ?? ""}
                onChange={(e) => patchContent({ question: e.target.value })}
                placeholder="Wie lautet der Code für das Schloss?"
              />
            </div>

            <div>
              <StudioLabel>Antwort-Typ</StudioLabel>
              <StudioSelect
                value={content.answer_type}
                onChange={(e) => {
                  const answer_type = e.target.value as StudioTaskContent["answer_type"];
                  patchContent({
                    answer_type,
                    options:
                      answer_type === "text"
                        ? undefined
                        : content.options?.length
                          ? content.options
                          : [{ id: createTaskOptionId(), label: "", correct: true }],
                  });
                }}
              >
                <option value="text">Freitext-Eingabe</option>
                <option value="choice">Multiple Choice (eine richtig)</option>
                <option value="multi_choice">Mehrfachauswahl (mehrere richtig)</option>
              </StudioSelect>
            </div>

            {content.answer_type === "text" ? (
              <div>
                <StudioLabel>Richtige Antwort</StudioLabel>
                <StudioInput
                  value={content.answer ?? ""}
                  onChange={(e) => patchContent({ answer: e.target.value })}
                  placeholder="Lösung"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <StudioLabel>
                  {content.answer_type === "choice"
                    ? "Antwortoptionen — genau eine als richtig markieren"
                    : "Antwortoptionen — alle richtigen markieren"}
                </StudioLabel>
                {(content.options ?? []).map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type={content.answer_type === "choice" ? "radio" : "checkbox"}
                      name="correct-option"
                      checked={Boolean(opt.correct)}
                      onChange={() => {
                        if (content.answer_type === "choice") setSingleCorrect(opt.id);
                        else patchOption(opt.id, { correct: !opt.correct });
                      }}
                      className="shrink-0"
                    />
                    <StudioInput
                      className="flex-1"
                      value={opt.label}
                      onChange={(e) => patchOption(opt.id, { label: e.target.value })}
                      placeholder="Antworttext"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(opt.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-600"
                      aria-label="Option entfernen"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                ))}
                <StudioButton
                  type="button"
                  variant="secondary"
                  icon={<IconPlus size={14} />}
                  onClick={addOption}
                >
                  Option hinzufügen
                </StudioButton>
              </div>
            )}
          </div>
        </StudioPanel>

        <div className="flex flex-wrap gap-3">
          <StudioButton type="submit" disabled={pending} icon={<IconSave size={16} />}>
            {pending ? "Speichern…" : task ? "Aufgabe speichern" : "Aufgabe erstellen"}
          </StudioButton>
          {task ? (
            <>
              <TaskDuplicateButton
                taskId={task.id}
                taskTitle={task.title}
                listPath={returnTo ?? "/admin/tasks"}
              />
              <TaskDeleteButton
                taskId={task.id}
                taskTitle={task.title}
                redirectTo={returnTo ?? "/admin/tasks"}
              />
            </>
          ) : null}
          <Link
            href={returnTo ?? "/admin/tasks"}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {returnTo ? (
              <>
                <IconArrowRight size={16} className="rotate-180" />
                Zurück zum Spiel
              </>
            ) : (
              "Abbrechen"
            )}
          </Link>
        </div>
      </div>

      <aside className="xl:sticky xl:top-8 xl:self-start">
        <StudioPanel>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Vorschau (Spieler-Ansicht)
          </p>
          <TaskEditorPreview title={title} description={description} content={previewContent} />
        </StudioPanel>
      </aside>
    </form>
  );
}
