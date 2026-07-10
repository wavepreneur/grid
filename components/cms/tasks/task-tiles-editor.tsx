"use client";

import type { StudioTaskContent, TaskContentTile, TaskScoring } from "@/lib/cms/types";
import { ImageUploadField } from "@/components/cms/shared/image-upload-field";
import {
  TASK_TILE_IMAGE_UPLOAD_DETAIL,
  TASK_TILE_IMAGE_UPLOAD_HINT,
} from "@/lib/cms/tile-image-spec";
import { createEmptyTile, createTaskTileId } from "@/lib/cms/task-content";
import { IconPlus, IconTrash } from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioInput,
  StudioLabel,
  StudioSelect,
  StudioTextarea,
} from "@/components/cms/studio-ui";

type Props = {
  tiles: TaskContentTile[];
  onChange: (tiles: TaskContentTile[]) => void;
};

const MEDIA_OPTIONS = [
  { value: "image", label: "Bild anzeigen" },
  { value: "audio", label: "Audio abspielen" },
  { value: "video", label: "Video abspielen" },
  { value: "iframe", label: "Webseite einbetten" },
] as const;

export function TaskTilesEditor({ tiles, onChange }: Props) {
  function patchTile(id: string, patch: Partial<TaskContentTile>) {
    onChange(tiles.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function removeTile(id: string) {
    onChange(tiles.filter((t) => t.id !== id));
  }

  function addTile() {
    onChange([...tiles, createEmptyTile()]);
  }

  return (
    <div className="space-y-4">
      {tiles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          Keine Kacheln — die Aufgabe funktioniert nur mit Frage & Antwort. Kacheln sind optional.
        </p>
      ) : (
        tiles.map((tile, index) => (
          <div
            key={tile.id}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Kachel {index + 1}</p>
              <button
                type="button"
                onClick={() => removeTile(tile.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-600"
                aria-label="Kachel entfernen"
              >
                <IconTrash size={14} />
              </button>
            </div>

            <ImageUploadField
              label="Kachel-Bild (Cover)"
              hint={TASK_TILE_IMAGE_UPLOAD_HINT}
              detail={TASK_TILE_IMAGE_UPLOAD_DETAIL}
              value={tile.cover_image_url ?? ""}
              onChange={(url) => patchTile(tile.id, { cover_image_url: url || undefined })}
            />

            <div>
              <StudioLabel>Beim Klick öffnen</StudioLabel>
              <StudioSelect
                value={tile.media_type}
                onChange={(e) =>
                  patchTile(tile.id, {
                    media_type: e.target.value as TaskContentTile["media_type"],
                  })
                }
              >
                {MEDIA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </StudioSelect>
            </div>

            <div>
              <StudioLabel>Medien-URL / Link</StudioLabel>
              <StudioInput
                value={tile.media_url}
                onChange={(e) => patchTile(tile.id, { media_url: e.target.value })}
                placeholder="https://…"
              />
            </div>

            <div>
              <StudioLabel hint="Optional — sonst Medien-Typ">Kurz-Label</StudioLabel>
              <StudioInput
                value={tile.label ?? ""}
                onChange={(e) => patchTile(tile.id, { label: e.target.value })}
                placeholder="z. B. Rätselblatt"
              />
            </div>

            <div className="rounded-xl border border-sky-100 bg-white p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                Hinweis zu dieser Kachel
              </p>
              <div>
                <StudioLabel hint="Optional — bezieht sich auf den Inhalt dieser Kachel">
                  Hinweis-Text
                </StudioLabel>
                <StudioTextarea
                  className="min-h-20"
                  value={tile.hint_text ?? ""}
                  onChange={(e) =>
                    patchTile(tile.id, {
                      hint_text: e.target.value || undefined,
                      hint_point_cost: tile.hint_point_cost ?? 50,
                    })
                  }
                  placeholder="Was der Spieler nach dem Freischalten sieht…"
                />
              </div>
              {tile.hint_text?.trim() ? (
                <div>
                  <StudioLabel hint="Punkte werden beim Freischalten abgezogen">
                    Kosten (Punkte)
                  </StudioLabel>
                  <StudioInput
                    type="number"
                    min={0}
                    value={tile.hint_point_cost ?? 50}
                    onChange={(e) =>
                      patchTile(tile.id, {
                        hint_point_cost: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>
        ))
      )}

      <StudioButton
        type="button"
        variant="secondary"
        icon={<IconPlus size={14} />}
        onClick={addTile}
        disabled={tiles.length >= 10}
      >
        Kachel hinzufügen
      </StudioButton>
    </div>
  );
}

export function TaskScoringEditor({
  scoring,
  onChange,
}: {
  scoring: TaskScoring;
  onChange: (scoring: TaskScoring) => void;
}) {
  function patch(patch: Partial<TaskScoring>) {
    onChange({ ...scoring, ...patch });
  }

  return (
    <div className="space-y-4">
      <div>
        <StudioLabel hint="Minus für Abzug, z. B. -50">Punkte bei Lösung</StudioLabel>
        <StudioInput
          type="number"
          value={scoring.points}
          onChange={(e) => patch({ points: Number(e.target.value) || 0 })}
        />
      </div>

      <div>
        <StudioLabel hint="Optional — Countdown für diese Aufgabe">Countdown (Sekunden)</StudioLabel>
        <StudioInput
          type="number"
          min={0}
          value={scoring.countdown_seconds ?? ""}
          onChange={(e) => {
            const raw = e.target.value.trim();
            patch({ countdown_seconds: raw ? Math.max(0, Number(raw) || 0) : null });
          }}
          placeholder="z. B. 180 für 3 Minuten"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={Boolean(scoring.decay_enabled)}
          onChange={(e) => patch({ decay_enabled: e.target.checked })}
        />
        <span>
          <span className="block text-sm font-medium text-slate-900">Punkte-Verfall aktivieren</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Spieler sehen, dass weniger Punkte erreichbar sind — schnell handeln, bevor nur noch
            Minimum übrig ist.
          </span>
        </span>
      </label>

      {scoring.decay_enabled ? (
        <div>
          <StudioLabel hint="Untergrenze beim Verfall">Mindest-Punkte</StudioLabel>
          <StudioInput
            type="number"
            min={0}
            value={scoring.decay_floor ?? 0}
            onChange={(e) => patch({ decay_floor: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
      ) : null}
    </div>
  );
}