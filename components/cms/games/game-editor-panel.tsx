"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeGameTemplate,
  saveGameAsTemplate,
  updateGame,
  updateGameLayerProfile,
} from "@/app/actions/cms/games";
import { StudioBadge, StudioPanel } from "@/components/cms/admin-shell";
import { GameLayerProfilePanel } from "@/components/cms/games/game-layer-profile-panel";
import { GameLogicPanel } from "@/components/cms/games/game-logic-panel";
import { GameSlotsPanel } from "@/components/cms/games/game-slots-panel";
import { GameDeleteButton } from "@/components/cms/games/game-delete-button";
import { GameDuplicateButton } from "@/components/cms/games/game-duplicate-button";
import { ImageUploadField } from "@/components/cms/shared/image-upload-field";
import { useStudioCache } from "@/lib/platform/studio-cache";
import {
  IconDevices,
  IconGamepad,
  IconKeyRound,
  IconMapPin,
  IconSave,
  IconTemplate,
} from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioError,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSuccess,
  StudioTextarea,
} from "@/components/cms/studio-ui";
import {
  parseActiveLayers,
  parseRuntimeProfiles,
  type ContentMode,
} from "@/lib/cms/layer-model";
import {
  surfaceDescriptionDe,
  surfaceLabelDe,
  surfaceTaglineDe,
  surfaceToPreset,
} from "@/lib/cms/game-slots";
import { parseLogicRules, type StudioLogicRule } from "@/lib/cms/logic-rules";
import type { StudioGame, StudioGameTaskLink } from "@/lib/cms/types";

type Props = {
  game: StudioGame;
  taskLinks: StudioGameTaskLink[];
};

type GameEditorState = Omit<StudioGame, "logic_rules"> & { logic_rules: StudioLogicRule[] };

function toEditorState(game: StudioGame): GameEditorState {
  return { ...game, logic_rules: parseLogicRules(game.logic_rules) };
}

const SURFACES: ContentMode[] = ["outdoor", "indoor", "online"];

function SurfaceIcon({ mode, active }: { mode: ContentMode; active: boolean }) {
  const cls = active ? "text-primary" : "text-muted-foreground";
  if (mode === "outdoor") return <IconMapPin size={22} className={cls} />;
  if (mode === "indoor") return <IconKeyRound size={22} className={cls} />;
  return <IconDevices size={22} className={cls} />;
}

export function GameEditorPanel({
  game: initialGame,
  taskLinks,
}: Props) {
  const router = useRouter();
  const cache = useStudioCache();
  const [game, setGame] = useState<GameEditorState>(() => toEditorState(initialGame));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const surface = parseRuntimeProfiles(game.runtime_profiles).default_mode;
  const routeOrder = parseRuntimeProfiles(game.runtime_profiles).route_order;
  const countdownOn = Boolean(game.duration_minutes && game.duration_minutes > 0);

  function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateGame({
        id: game.id,
        name: game.name,
        description: game.description,
        language: game.language,
        city_slug: game.city_slug,
        duration_minutes: game.duration_minutes,
        gps_enabled: game.gps_enabled,
        farewell_text: game.farewell_text,
        logo_url: game.logo_url,
        runtime_profiles: parseRuntimeProfiles(game.runtime_profiles),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setGame(toEditorState(result.data!));
      cache.setGame(result.data!);
      setMessage("Spiel gespeichert.");
    });
  }

  function handleSurfaceChange(next: ContentMode) {
    if (next === surface) return;
    setError(null);
    startTransition(async () => {
      const preset = surfaceToPreset(next);
      const profiles = parseRuntimeProfiles(game.runtime_profiles);
      const runtime_profiles = {
        ...profiles,
        default_mode: next,
        allowed_fallbacks: profiles.allowed_fallbacks.filter((m) => m !== next),
      };
      const result = await updateGameLayerProfile({
        id: game.id,
        active_layers: [...preset.activeLayers],
        runtime_profiles,
        gps_enabled: next === "outdoor",
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setGame(toEditorState(result.data!));
      cache.setGame(result.data!);
      setMessage(`Layout: ${surfaceLabelDe(next)}`);
    });
  }

  function handleSaveTemplate() {
    startTransition(async () => {
      const result = await saveGameAsTemplate(game.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage('Als Vorlage gespeichert.');
      cache.invalidateGame(game.id);
      router.push("/admin/games#vorlagen");
    });
  }

  function handleRemoveTemplate() {
    startTransition(async () => {
      const result = await removeGameTemplate(game.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setGame((g) => ({ ...g, is_template: false }));
      cache.patchGame(game.id, { is_template: false });
      setMessage("Wieder als normales Spiel.");
    });
  }

  return (
    <div className="space-y-8">
      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      <StudioPanel>
        <StudioSectionTitle
          title="1 · Layout"
          description="Wie und wo wird gespielt — GPS draußen, Codes im Raum oder gemeinsam an verschiedenen Geräten."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {SURFACES.map((mode) => {
            const active = surface === mode;
            return (
              <button
                key={mode}
                type="button"
                disabled={pending}
                onClick={() => handleSurfaceChange(mode)}
                className={`rounded-3xl border-2 px-4 py-5 text-left transition ${
                  active
                    ? "border-primary bg-primary/10 shadow-soft"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span
                  className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${
                    active ? "bg-primary/15" : "bg-secondary"
                  }`}
                >
                  <SurfaceIcon mode={mode} active={active} />
                </span>
                <p className="text-base font-bold text-foreground">{surfaceLabelDe(mode)}</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-primary/80">
                  {surfaceTaglineDe(mode)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {surfaceDescriptionDe(mode)}
                </p>
              </button>
            );
          })}
        </div>
      </StudioPanel>

      <form onSubmit={handleSaveSettings}>
        <StudioPanel>
          <StudioSectionTitle
            title="2 · Spieldaten"
            description="Titel, Bild, optionaler Countdown und Kurztext."
          />

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <StudioBadge tone={game.status === "published" ? "live" : "draft"}>
              {game.status === "published"
                ? "Veröffentlicht"
                : game.status === "archived"
                  ? "Archiviert"
                  : "Entwurf"}
            </StudioBadge>
            {game.is_template ? <StudioBadge tone="draft">Vorlage</StudioBadge> : null}
            <StudioBadge>{surfaceLabelDe(surface)}</StudioBadge>
            <p className="text-xs text-muted-foreground">
              Veröffentlichen und Live-Events steuerst du in der Spiele-Liste.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <StudioLabel>Titel</StudioLabel>
              <StudioInput
                value={game.name}
                onChange={(e) => setGame({ ...game, name: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2">
              <ImageUploadField
                label="Bild"
                hint="Wird in Lobby und Spielkopf gezeigt"
                value={game.logo_url ?? ""}
                onChange={(url) => setGame({ ...game, logo_url: url || null })}
                onClear={() => setGame({ ...game, logo_url: null })}
              />
            </div>
            <div className="md:col-span-2">
              <StudioLabel>Beschreibung</StudioLabel>
              <StudioTextarea
                className="min-h-20"
                value={game.description}
                onChange={(e) => setGame({ ...game, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <section className="rounded-3xl bg-secondary/60 p-4 sm:p-5">
                <p className="text-base font-bold text-foreground">Reihenfolge</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Outdoor: Alle Wegpunkte erscheinen auf der Karte. Linear hebt das aktuelle Ziel
                  hervor; frei lässt jeden offenen Punkt anlaufen.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        value: "linear" as const,
                        label: "Linear",
                        hint: "Nacheinander — Spieler sehen, wohin als Nächstes",
                      },
                      {
                        value: "free" as const,
                        label: "Freie Reihenfolge",
                        hint: "Alle Aufgaben ab Start offen und lösbar",
                      },
                    ] as const
                  ).map((opt) => {
                    const active = routeOrder === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          setGame({
                            ...game,
                            runtime_profiles: {
                              ...parseRuntimeProfiles(game.runtime_profiles),
                              route_order: opt.value,
                            },
                          })
                        }
                        className={`rounded-2xl border-2 px-4 py-3 text-left transition ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <span className="block font-semibold text-foreground">{opt.label}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{opt.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
            <div className="md:col-span-2">
              <section className="rounded-3xl bg-secondary/60 p-4 sm:p-5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary"
                    checked={countdownOn}
                    onChange={(e) =>
                      setGame({
                        ...game,
                        duration_minutes: e.target.checked
                          ? game.duration_minutes && game.duration_minutes > 0
                            ? game.duration_minutes
                            : 90
                          : null,
                      })
                    }
                  />
                  <span>
                    <span className="block text-base font-bold text-foreground">
                      Countdown für das ganze Spiel
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      Mission-Zeit für alle Teams. Einzelne Aufgaben können zusätzlich eigene Timer
                      haben.
                    </span>
                  </span>
                </label>
                {countdownOn ? (
                  <div className="mt-4 max-w-xs">
                    <StudioLabel>Dauer (Minuten)</StudioLabel>
                    <StudioInput
                      type="number"
                      min={1}
                      value={game.duration_minutes ?? 90}
                      onChange={(e) =>
                        setGame({
                          ...game,
                          duration_minutes: Math.max(1, Number(e.target.value) || 90),
                        })
                      }
                    />
                  </div>
                ) : null}
              </section>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
            <StudioButton type="submit" disabled={pending} icon={<IconSave size={16} />}>
              {pending ? "Speichern…" : "Speichern"}
            </StudioButton>
            {!game.is_template ? (
              <>
                <StudioButton
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  icon={<IconTemplate size={16} />}
                  onClick={handleSaveTemplate}
                >
                  Als Vorlage
                </StudioButton>
                <GameDuplicateButton gameId={game.id} gameName={game.name} />
              </>
            ) : (
              <StudioButton
                type="button"
                variant="ghost"
                disabled={pending}
                icon={<IconGamepad size={16} />}
                onClick={handleRemoveTemplate}
              >
                Als Spiel wiederherstellen
              </StudioButton>
            )}
            <GameDeleteButton gameId={game.id} gameName={game.name} />
          </div>
        </StudioPanel>
      </form>

      <GameSlotsPanel
        gameId={game.id}
        surface={surface}
        routeOrder={routeOrder}
        language={game.language}
        initialLinks={taskLinks}
      />

      <details className="group rounded-2xl border border-border bg-card">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          Erweitert
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Layer-Profil, GPS-Feinheiten und Legacy-Logik — für die meisten Spiele nicht nötig.
          </span>
        </summary>
        <div className="space-y-6 border-t border-border px-2 pb-4 pt-4 sm:px-4">
          <GameLayerProfilePanel game={game} />
          <GameLogicPanel
            gameId={game.id}
            language={game.language}
            gpsEnabled={game.gps_enabled}
            citySlug={game.city_slug}
            activeLayers={parseActiveLayers(game.active_layers)}
            initialLinks={taskLinks}
            initialRules={game.logic_rules}
          />
        </div>
      </details>
    </div>
  );
}
