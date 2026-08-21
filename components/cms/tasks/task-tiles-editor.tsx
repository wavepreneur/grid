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
  function patch(next: Partial<TaskScoring>) {
    onChange({ ...scoring, ...next });
  }

  const countdown = scoring.countdown_seconds && scoring.countdown_seconds > 0
    ? scoring.countdown_seconds
    : null;
  const countdownOn = Boolean(countdown);
  const decayOn = Boolean(scoring.decay_enabled) && countdownOn;
  const floor = scoring.decay_floor ?? 0;
  const points = scoring.points;
  const presets = [
    { label: "1 Min", seconds: 60 },
    { label: "3 Min", seconds: 180 },
    { label: "5 Min", seconds: 300 },
    { label: "10 Min", seconds: 600 },
  ] as const;

  function setCountdownSeconds(seconds: number | null) {
    const next = seconds && seconds > 0 ? seconds : null;
    patch({
      countdown_seconds: next,
      // Verfall braucht den Countdown — ohne Zeitfenster aus.
      decay_enabled: next ? scoring.decay_enabled : false,
    });
  }

  function toggleCountdown(on: boolean) {
    if (on) {
      setCountdownSeconds(countdown ?? 180);
      return;
    }
    setCountdownSeconds(null);
  }

  function toggleDecay(on: boolean) {
    if (on && !countdownOn) {
      // Countdown ist die Messlatte für den Verfall.
      patch({ countdown_seconds: 180, decay_enabled: true });
      return;
    }
    patch({ decay_enabled: on });
  }

  return (
    <div className="space-y-4">
      <div>
        <StudioLabel hint="Volle Punktzahl bei rechtzeitiger Lösung">Punkte bei Lösung</StudioLabel>
        <StudioInput
          type="number"
          value={scoring.points}
          onChange={(e) => patch({ points: Number(e.target.value) || 0 })}
        />
      </div>

      <section className="rounded-3xl bg-secondary/60 p-4 sm:p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-primary"
            checked={countdownOn}
            onChange={(e) => toggleCountdown(e.target.checked)}
          />
          <span>
            <span className="block text-base font-bold text-foreground">
              Countdown für diese Aufgabe
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Maximale Zeit, die das Team an dieser Aufgabe rätseln darf.
            </span>
          </span>
        </label>

        {countdownOn ? (
          <div className="mt-4 space-y-3">
            <div>
              <StudioLabel>Countdown (Sekunden)</StudioLabel>
              <StudioInput
                type="number"
                min={1}
                value={countdown ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  setCountdownSeconds(raw ? Math.max(1, Number(raw) || 0) : null);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.seconds}
                  type="button"
                  onClick={() => setCountdownSeconds(p.seconds)}
                  className={`tap-lift rounded-2xl px-3 py-1.5 text-sm font-bold ${
                    countdown === p.seconds
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground shadow-soft"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl bg-secondary/60 p-4 sm:p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-primary"
            checked={decayOn}
            onChange={(e) => toggleDecay(e.target.checked)}
          />
          <span>
            <span className="block text-base font-bold text-foreground">
              Punkte-Verfall aktivieren
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Die Punkte sinken linear über den Countdown — am Ende der Zeit bleibt nur das Minimum.
            </span>
          </span>
        </label>

        {decayOn && countdown ? (
          <div className="mt-4 space-y-3">
            <div>
              <StudioLabel hint="Erreichbar, wenn die Zeit abgelaufen ist">Mindestpunkte</StudioLabel>
              <StudioInput
                type="number"
                min={0}
                value={floor}
                onChange={(e) => patch({ decay_floor: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <p className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
              <span className="font-bold text-foreground">{points} Punkte</span> sinken über{" "}
              <span className="font-bold text-foreground">{countdown} Sekunden</span> (Countdown)
              auf <span className="font-bold text-foreground">{floor} Punkte</span>.
              Keine zweite Zeit nötig — der Verfall hängt am Countdown.
            </p>
          </div>
        ) : null}

        {!countdownOn ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Zum Verfall zuerst einen Countdown setzen — daran wird der Abbau gemessen.
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl bg-secondary/60 p-4 sm:p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-primary"
            checked={Boolean(scoring.allow_reveal_solution)}
            onChange={(e) => patch({ allow_reveal_solution: e.target.checked })}
          />
          <span>
            <span className="block text-base font-bold text-foreground">
              Lösung anzeigen erlauben
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Das Team kann aufgeben. Die Aufgabe gilt dann als erledigt, bringt aber 0 Punkte.
              {countdownOn
                ? " Läuft der Countdown ab, wird die Lösung ebenfalls gezeigt und die Aufgabe mit 0 Punkten übersprungen."
                : ""}
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}
