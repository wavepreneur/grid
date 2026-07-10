"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upsertTask, type TaskUpsertInput } from "@/app/actions/cms/tasks";
import { TaskIconPicker, TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
import { ImageUploadField } from "@/components/cms/shared/image-upload-field";
import { StudioPanel } from "@/components/cms/admin-shell";
import { IconArrowRight, IconSave } from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioError,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSelect,
  StudioTextarea,
} from "@/components/cms/studio-ui";
import {
  DEFAULT_TASK_CONTENT,
  type StudioTask,
  type StudioTaskContent,
  type TaskOpenMediaType,
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
  const [language, setLanguage] = useState<"de" | "en">(task?.language ?? "de");
  const [citySlug, setCitySlug] = useState(task?.city_slug ?? "");
  const [gameType, setGameType] = useState(task?.game_type ?? "");
  const [tags, setTags] = useState((task?.tags ?? []).join(", "));
  const [content, setContent] = useState<StudioTaskContent>(
    task?.content ?? DEFAULT_TASK_CONTENT,
  );

  const previewContent = useMemo(() => content, [content]);

  function patchContent(patch: Partial<StudioTaskContent>) {
    setContent((prev) => ({ ...prev, ...patch }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const payload: TaskUpsertInput = {
      id: task?.id,
      title,
      description,
      language,
      city_slug: citySlug || null,
      game_type: gameType || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      content,
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

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        {error ? <StudioError message={error} /> : null}

        <StudioPanel>
          <StudioSectionTitle
            title="Grunddaten"
            description="Name und Kategorien für die Bibliothek"
          />
          <div className="space-y-4">
            <div>
              <StudioLabel>Titel</StudioLabel>
              <StudioInput value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <StudioLabel>Beschreibung</StudioLabel>
              <StudioTextarea
                className="min-h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <StudioLabel>Sprache</StudioLabel>
                <StudioSelect
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "de" | "en")}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </StudioSelect>
              </div>
              <div>
                <StudioLabel hint="Zum Filtern in der Bibliothek">Stadt</StudioLabel>
                <StudioInput
                  value={citySlug}
                  onChange={(e) => setCitySlug(e.target.value)}
                  placeholder="berlin"
                />
              </div>
              <div>
                <StudioLabel hint="z. B. outdoor, quiz">Spiel-Typ</StudioLabel>
                <StudioInput
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                  placeholder="outdoor, quiz…"
                />
              </div>
              <div>
                <StudioLabel hint="Kommagetrennt">Tags</StudioLabel>
                <StudioInput
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="kira, berlin"
                />
              </div>
            </div>
          </div>
        </StudioPanel>

        <StudioPanel>
          <StudioSectionTitle
            title="Kachel & Medien"
            description="So sieht die Aufgabe für Spieler aus"
          />
          <div className="space-y-4">
            <div>
              <StudioLabel>Darstellung auf der Karte</StudioLabel>
              <StudioSelect
                value={content.tile.display}
                onChange={(e) =>
                  patchContent({
                    tile: {
                      ...content.tile,
                      display: e.target.value as "icon" | "image",
                    },
                  })
                }
              >
                <option value="icon">Icon (Standard)</option>
                <option value="image">Vollbild-Bild</option>
              </StudioSelect>
            </div>

            {content.tile.display === "icon" ? (
              <div>
                <StudioLabel>Icon wählen</StudioLabel>
                <TaskIconPicker
                  value={content.tile.icon_key}
                  onChange={(key) =>
                    patchContent({ tile: { ...content.tile, icon_key: key } })
                  }
                />
              </div>
            ) : (
              <div>
                <StudioLabel>Bild-URL</StudioLabel>
                <StudioInput
                  value={content.tile.image_url ?? ""}
                  onChange={(e) =>
                    patchContent({ tile: { ...content.tile, image_url: e.target.value } })
                  }
                  placeholder="https://…"
                />
              </div>
            )}

            <ImageUploadField
              label="Kachel-Bild"
              hint="Füllt die gesamte Kachel — Icon wird ausgeblendet."
              value={content.tile.label_image_url ?? ""}
              onChange={(url) =>
                patchContent({
                  tile: { ...content.tile, label_image_url: url || undefined },
                })
              }
            />

            <div>
              <StudioLabel hint="Fallback wenn kein Bild gesetzt">Kachel-Text</StudioLabel>
              <StudioInput
                value={content.tile.label ?? ""}
                onChange={(e) =>
                  patchContent({ tile: { ...content.tile, label: e.target.value } })
                }
                placeholder="Kurzer Text"
              />
            </div>

            <div>
              <StudioLabel>Beim Öffnen der Aufgabe</StudioLabel>
              <StudioSelect
                value={content.open_media.type}
                onChange={(e) =>
                  patchContent({
                    open_media: {
                      ...content.open_media,
                      type: e.target.value as TaskOpenMediaType,
                    },
                  })
                }
              >
                <option value="none">Frage & Eingabe</option>
                <option value="image">Bild anzeigen</option>
                <option value="audio">Audio abspielen</option>
                <option value="video">Video abspielen</option>
                <option value="iframe">Webseite einbetten</option>
              </StudioSelect>
            </div>

            {content.open_media.type !== "none" ? (
              <div>
                <StudioLabel>Medien-URL / Link</StudioLabel>
                <StudioInput
                  value={content.open_media.url ?? ""}
                  onChange={(e) =>
                    patchContent({
                      open_media: { ...content.open_media, url: e.target.value },
                    })
                  }
                />
              </div>
            ) : (
              <>
                <div>
                  <StudioLabel>Frage</StudioLabel>
                  <StudioInput
                    value={content.question ?? ""}
                    onChange={(e) => patchContent({ question: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <StudioLabel>Antwort-Typ</StudioLabel>
                    <StudioSelect
                      value={content.answer_type}
                      onChange={(e) =>
                        patchContent({
                          answer_type: e.target.value as StudioTaskContent["answer_type"],
                        })
                      }
                    >
                      <option value="text">Text</option>
                      <option value="number">Zahl</option>
                      <option value="choice">Auswahl</option>
                    </StudioSelect>
                  </div>
                  <div>
                    <StudioLabel>Richtige Antwort</StudioLabel>
                    <StudioInput
                      value={content.answer ?? ""}
                      onChange={(e) => patchContent({ answer: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </StudioPanel>

        <div className="flex flex-wrap gap-3">
          <StudioButton type="submit" disabled={pending} icon={<IconSave size={16} />}>
            {pending ? "Speichern…" : task ? "Aufgabe speichern" : "Aufgabe erstellen"}
          </StudioButton>
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
            Vorschau
          </p>
          <div className="mx-auto w-[260px] rounded-[1.75rem] border border-slate-200 bg-slate-900 p-3 shadow-lg">
            <div className="rounded-[1.25rem] bg-[#0b1220] p-4">
              <TaskTilePreview title={title || "Neue Aufgabe"} content={previewContent} solo />
              <p className="mt-4 text-center text-xs text-slate-400">
                {content.open_media.type === "none"
                  ? "Öffnet Frage & Eingabefeld"
                  : `Öffnet ${content.open_media.type}`}
              </p>
            </div>
          </div>
        </StudioPanel>
      </aside>
    </form>
  );
}
