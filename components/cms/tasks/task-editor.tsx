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
import { useStudioCache } from "@/lib/platform/studio-cache";
import { useStudioDirtySnapshot } from "@/components/cms/studio-unsaved";
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
  charsToCodeBoxAnswer,
  codeBoxChars,
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
  const cache = useStudioCache();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [tags, setTags] = useState((task?.tags ?? []).join(", "));
  const [content, setContent] = useState<StudioTaskContent>(() =>
    normalizeTaskContent(task?.content ?? DEFAULT_TASK_CONTENT),
  );

  const dirtySnapshot = useMemo(
    () =>
      JSON.stringify({
        title,
        description,
        tags,
        content: normalizeTaskContent(content),
      }),
    [title, description, tags, content],
  );
  const { acknowledgeSaved } = useStudioDirtySnapshot(dirtySnapshot);

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
      cache.setTask(result.data!);
      acknowledgeSaved(
        JSON.stringify({
          title: result.data!.title,
          description: result.data!.description ?? "",
          tags: (result.data!.tags ?? []).join(", "),
          content: normalizeTaskContent(result.data!.content),
        }),
      );
      // Stay on the editor after save — remounting the same route wipes local form feel.
      // Only navigate when creating a brand-new task (no id yet).
      if (!task?.id) {
        router.push(returnTo ?? `/admin/tasks/${result.data!.id}`);
      }
    });
  }

  const scoring = content.scoring ?? defaultTaskScoring();

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        const target = event.target as HTMLElement;
        if (target.tagName === "TEXTAREA") return;
        if (target.tagName === "INPUT") event.preventDefault();
      }}
      className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]"
    >
      <div className="min-w-0 space-y-6">
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
            description="Countdown setzt das Zeitfenster. Punkte-Verfall senkt die Punkte linear über genau diese Zeit."
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
                  if (answer_type === "text") {
                    patchContent({
                      answer_type,
                      options: undefined,
                      code_boxes: content.code_boxes,
                      number_fields: content.code_boxes
                        ? charsToCodeBoxAnswer(content.answer ?? "").number_fields
                        : undefined,
                    });
                  } else if (answer_type === "confirm") {
                    patchContent({
                      answer_type,
                      options: undefined,
                      number_fields: undefined,
                      code_boxes: undefined,
                      answer: undefined,
                    });
                  } else {
                    patchContent({
                      answer_type,
                      number_fields: undefined,
                      code_boxes: undefined,
                      options:
                        content.options?.length
                          ? content.options
                          : [{ id: createTaskOptionId(), label: "", correct: true }],
                    });
                  }
                }}
              >
                <option value="text">Freitext-Eingabe</option>
                <option value="choice">Multiple Choice (eine richtig)</option>
                <option value="multi_choice">Mehrfachauswahl (mehrere richtig)</option>
                <option value="confirm">Keine Eingabe (nur OK)</option>
              </StudioSelect>
            </div>

            {content.answer_type === "text" ? (
              <div className="space-y-4">
                <div>
                  <StudioLabel>
                    {content.code_boxes ? "Richtiger Code" : "Richtige Antwort"}
                  </StudioLabel>
                  <StudioInput
                    value={
                      content.code_boxes
                        ? codeBoxChars(content.answer)
                        : (content.answer ?? "")
                    }
                    maxLength={content.code_boxes ? 4 : undefined}
                    className={
                      content.code_boxes
                        ? "text-center text-2xl font-bold tracking-[0.35em]"
                        : undefined
                    }
                    onChange={(e) => {
                      if (content.code_boxes) {
                        const next = charsToCodeBoxAnswer(e.target.value);
                        patchContent({
                          answer: next.answer,
                          number_fields: next.number_fields,
                        });
                        return;
                      }
                      patchContent({ answer: e.target.value });
                    }}
                    placeholder={content.code_boxes ? "z. B. A3B4 oder 0364" : "Lösung"}
                  />
                  {content.code_boxes ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {(content.number_fields ?? 1) === 1
                        ? "Vorschau: 1 Kästchen"
                        : `Vorschau: ${content.number_fields} Kästchen`}
                    </p>
                  ) : null}
                </div>

                <section className="rounded-3xl bg-secondary/60 p-4 sm:p-5">
                  <p className="text-base font-bold text-foreground">Code-Box</p>
                  <label className="mt-3 flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-primary"
                      checked={Boolean(content.code_boxes)}
                      onChange={(e) => {
                        const on = e.target.checked;
                        if (!on) {
                          patchContent({
                            code_boxes: false,
                            number_fields: undefined,
                            answer: codeBoxChars(content.answer) || content.answer,
                          });
                          return;
                        }
                        const next = charsToCodeBoxAnswer(content.answer ?? "");
                        patchContent({
                          code_boxes: true,
                          answer: next.answer,
                          number_fields: next.number_fields,
                        });
                      }}
                    />
                    <span>
                      <span className="block text-base font-bold text-foreground">
                        Getrenntes Kästchen pro Zeichen
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        Max. 4 Zeichen — Zahlen, Buchstaben oder Mix
                      </span>
                    </span>
                  </label>
                </section>
              </div>
            ) : content.answer_type === "confirm" ? (
              <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
                Spieler tippen nur auf „OK“ — keine Antwort eingeben. Ideal, wenn die Kacheln
                schon alles zeigen.
              </p>
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

        <StudioPanel>
          <StudioSectionTitle
            title="Nach der Lösung"
            description={
              content.answer_type === "choice" || content.answer_type === "multi_choice"
                ? "Als Mission: Erfolgs-Hinweis. Als Einstiegsfrage im Spiel: Side-Fact nach der Antwort (Stadttour)."
                : "Nur bei korrekter Lösung — nicht bei Skip oder abgelaufenem Countdown."
            }
          />
          <div className="space-y-4">
            <div>
              <StudioLabel hint="Steht groß über der Info im Erfolgs-Screen">Überschrift</StudioLabel>
              <StudioInput
                value={content.success_title ?? ""}
                onChange={(e) =>
                  patchContent({
                    success_title: e.target.value,
                  })
                }
                placeholder="Notiert euch das"
              />
            </div>
            <div>
              <StudioLabel
                hint={
                  content.answer_type === "choice" || content.answer_type === "multi_choice"
                    ? "Bei Einstiegsfragen: erscheint nach der Antwort als „Wusstet ihr?“. Bei normalen Missionen: nur nach korrekter Lösung."
                    : "Erscheint im Erfolgs-Screen, nachdem die Aufgabe richtig gelöst wurde. Leer lassen, wenn es nichts zu notieren gibt."
                }
              >
                Info für das Team
              </StudioLabel>
              <StudioTextarea
                value={content.success_info ?? ""}
                onChange={(e) =>
                  patchContent({
                    success_info: e.target.value,
                  })
                }
                placeholder="z. B. Der Brunnen steht seit 1732 — früher war hier der Marktplatz."
                rows={3}
              />
            </div>
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

      <aside className="min-w-0 xl:sticky xl:top-8 xl:self-start">
        <StudioPanel className="overflow-hidden">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Vorschau (Spieler-Ansicht)
          </p>
          <TaskEditorPreview title={title} description={description} content={previewContent} />
        </StudioPanel>
      </aside>
    </form>
  );
}
