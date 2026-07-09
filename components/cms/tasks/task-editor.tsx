"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upsertTask, type TaskUpsertInput } from "@/app/actions/cms/tasks";
import {
  GridButton,
  GridError,
  GridInput,
  GridLabel,
  GridSelect,
} from "@/components/grid/grid-shell";
import { TaskIconPicker, TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
import { ImageUploadField } from "@/components/cms/shared/image-upload-field";
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
    <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {error ? <GridError message={error} /> : null}

        <section className="grid-panel space-y-4 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white">Grunddaten</h2>
          <div>
            <GridLabel>Titel</GridLabel>
            <GridInput value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <GridLabel>Beschreibung</GridLabel>
            <textarea
              className="grid-input min-h-24 w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <GridLabel>Sprache</GridLabel>
              <GridSelect value={language} onChange={(e) => setLanguage(e.target.value as "de" | "en")}>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </GridSelect>
            </div>
            <div>
              <GridLabel>Stadt (Filter)</GridLabel>
              <GridInput
                value={citySlug}
                onChange={(e) => setCitySlug(e.target.value)}
                placeholder="berlin"
              />
            </div>
            <div>
              <GridLabel>Game-Typ (Filter)</GridLabel>
              <GridInput
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                placeholder="outdoor, quiz, pulse…"
              />
            </div>
            <div>
              <GridLabel>Tags (kommagetrennt)</GridLabel>
              <GridInput value={tags} onChange={(e) => setTags(e.target.value)} placeholder="kira, berlin" />
            </div>
          </div>
        </section>

        <section className="grid-panel space-y-4 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white">Kachel &amp; Medien</h2>
          <div>
            <GridLabel>Darstellung</GridLabel>
            <GridSelect
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
            </GridSelect>
          </div>

          {content.tile.display === "icon" ? (
            <div>
              <GridLabel>Icon</GridLabel>
              <TaskIconPicker
                value={content.tile.icon_key}
                onChange={(key) =>
                  patchContent({ tile: { ...content.tile, icon_key: key } })
                }
              />
            </div>
          ) : (
            <div>
              <GridLabel>Bild-URL</GridLabel>
              <GridInput
                value={content.tile.image_url ?? ""}
                onChange={(e) =>
                  patchContent({ tile: { ...content.tile, image_url: e.target.value } })
                }
                placeholder="https://…"
              />
            </div>
          )}

          <div>
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
          </div>

          <div>
            <GridLabel>Kachel-Text (optional, Fallback)</GridLabel>
            <GridInput
              value={content.tile.label ?? ""}
              onChange={(e) =>
                patchContent({ tile: { ...content.tile, label: e.target.value } })
              }
              placeholder="Kurzer Text falls kein Bild"
            />
          </div>

          <div>
            <GridLabel>Beim Öffnen</GridLabel>
            <GridSelect
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
              <option value="none">Frage &amp; Eingabe</option>
              <option value="image">Bild</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
              <option value="iframe">iFrame (Link)</option>
            </GridSelect>
          </div>

          {content.open_media.type !== "none" ? (
            <div>
              <GridLabel>Medien-URL / iFrame-Link</GridLabel>
              <GridInput
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
                <GridLabel>Frage</GridLabel>
                <GridInput
                  value={content.question ?? ""}
                  onChange={(e) => patchContent({ question: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <GridLabel>Antwort-Typ</GridLabel>
                  <GridSelect
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
                  </GridSelect>
                </div>
                <div>
                  <GridLabel>Lösung</GridLabel>
                  <GridInput
                    value={content.answer ?? ""}
                    onChange={(e) => patchContent({ answer: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <GridButton type="submit" disabled={pending} className="w-auto px-8">
            {pending ? "Speichern…" : task ? "Task aktualisieren" : "Task erstellen"}
          </GridButton>
          <Link
            href={returnTo ?? "/admin/tasks"}
            className="inline-flex items-center rounded-xl border border-[var(--grid-border)] px-5 py-3 text-sm text-[var(--grid-muted)] hover:text-white"
          >
            {returnTo ? "Zurück zum Game" : "Abbrechen"}
          </Link>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div className="grid-panel rounded-2xl p-6">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--grid-muted)]">
            Live Preview
          </p>
          <div className="mx-auto w-[280px] rounded-[2rem] border border-white/10 bg-black/40 p-3 shadow-2xl">
            <div className="rounded-[1.5rem] bg-[#0b1220] p-4">
              <TaskTilePreview title={title || "Neuer Task"} content={previewContent} solo />
              <p className="mt-4 text-center text-xs text-[var(--grid-muted)]">
                {content.open_media.type === "none"
                  ? "Öffnet Frage & Eingabefeld"
                  : `Öffnet ${content.open_media.type}`}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}
