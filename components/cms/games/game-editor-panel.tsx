"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLiveEventFromGame } from "@/app/actions/cms/events";
import {
  publishGame,
  removeGameTemplate,
  saveGameAsTemplate,
  updateGame,
} from "@/app/actions/cms/games";
import { StudioBadge, StudioPanel } from "@/components/cms/admin-shell";
import { GameLayerProfilePanel } from "@/components/cms/games/game-layer-profile-panel";
import { GameLogicPanel } from "@/components/cms/games/game-logic-panel";
import { GameDeleteButton } from "@/components/cms/games/game-delete-button";
import { GameDuplicateButton } from "@/components/cms/games/game-duplicate-button";
import { GameStatusSwitch } from "@/components/cms/games/game-status-switch";
import {
  IconGamepad,
  IconPlay,
  IconSave,
  IconTemplate,
  IconUpload,
} from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSelect,
  StudioSuccess,
  StudioTextarea,
} from "@/components/cms/studio-ui";
import { parseActiveLayers } from "@/lib/cms/layer-model";
import { parseLogicRules, type StudioLogicRule } from "@/lib/cms/logic-rules";
import type { StudioGame, StudioGameTaskLink } from "@/lib/cms/types";

type Props = {
  game: StudioGame;
  taskLinks: StudioGameTaskLink[];
  liveEventCount?: number;
};

type GameEditorState = Omit<StudioGame, "logic_rules"> & { logic_rules: StudioLogicRule[] };

function toEditorState(game: StudioGame): GameEditorState {
  return { ...game, logic_rules: parseLogicRules(game.logic_rules) };
}

export function GameEditorPanel({
  game: initialGame,
  taskLinks,
  liveEventCount = 0,
}: Props) {
  const router = useRouter();
  const [game, setGame] = useState<GameEditorState>(() => toEditorState(initialGame));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [liveLink, setLiveLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setGame(toEditorState(result.data!));
      setMessage("Einstellungen gespeichert — laufende Events bleiben unverändert.");
      router.refresh();
    });
  }

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishGame(game.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setGame((g) => ({
        ...g,
        status: "published",
        published_version_number: result.data!.versionNumber,
      }));
      setMessage(`Version ${result.data!.versionNumber} veröffentlicht — bereit für Live-Events.`);
      router.refresh();
    });
  }

  function handleSaveTemplate() {
    startTransition(async () => {
      const result = await saveGameAsTemplate(game.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage('Als Vorlage gespeichert — findest du auf der Spiele-Seite unter „Meine Vorlagen".');
      router.push("/admin/games#vorlagen");
      router.refresh();
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
      setMessage('Vorlagen-Status entfernt — das Spiel erscheint wieder unter „Meine Spiele".');
      router.refresh();
    });
  }

  function handleStartLiveEvent() {
    if (!window.confirm("Live-Event aus der veröffentlichten Version erstellen?")) return;
    setError(null);
    setLiveLink(null);
    startTransition(async () => {
      const result = await createLiveEventFromGame(game.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setLiveLink(result.data!.joinPath);
      setMessage(
        `Live-Event erstellt — Code ${result.data!.inviteCode}. Teams können über den Link beitreten.`,
      );
    });
  }

  return (
    <div className="space-y-8">
      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      <form onSubmit={handleSaveSettings}>
        <StudioPanel>
          <StudioSectionTitle
            title="Spiel-Einstellungen"
            description="Grunddaten für dieses Spiel — Änderungen betreffen nur den Entwurf."
          />

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <GameStatusSwitch
              gameId={game.id}
              status={game.status}
              publishedVersionNumber={game.published_version_number}
              liveEventCount={liveEventCount}
              onStatusChange={(next) => setGame((g) => ({ ...g, status: next }))}
            />
            {game.is_template ? <StudioBadge tone="draft">Vorlage</StudioBadge> : null}
            {!game.is_template ? (
              <StudioBadge>Version {game.published_version_number}</StudioBadge>
            ) : null}
            {game.gps_enabled ? (
              <StudioBadge>GPS</StudioBadge>
            ) : (
              <StudioBadge>Indoor</StudioBadge>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <StudioLabel>Name</StudioLabel>
              <StudioInput
                value={game.name}
                onChange={(e) => setGame({ ...game, name: e.target.value })}
                required
              />
            </div>
            <div>
              <StudioLabel hint="Optional — wird in der Lobby angezeigt">Logo-URL</StudioLabel>
              <StudioInput
                value={game.logo_url ?? ""}
                onChange={(e) => setGame({ ...game, logo_url: e.target.value || null })}
                placeholder="https://…"
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
            <div>
              <StudioLabel>Sprache</StudioLabel>
              <StudioSelect
                value={game.language}
                onChange={(e) => setGame({ ...game, language: e.target.value as "de" | "en" })}
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </StudioSelect>
            </div>
            <div>
              <StudioLabel hint="Für Karten-Zentrum bei GPS-Spielen">Stadt</StudioLabel>
              <StudioInput
                value={game.city_slug ?? ""}
                onChange={(e) => setGame({ ...game, city_slug: e.target.value || null })}
                placeholder="berlin"
              />
            </div>
            <div>
              <StudioLabel>Spieldauer (Minuten)</StudioLabel>
              <StudioInput
                type="number"
                min={1}
                value={game.duration_minutes ?? ""}
                onChange={(e) =>
                  setGame({
                    ...game,
                    duration_minutes: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="md:col-span-2">
              <StudioLabel hint="Wird am Spielende allen Teams angezeigt">Abschiedstext</StudioLabel>
              <StudioTextarea
                className="min-h-16"
                value={game.farewell_text}
                onChange={(e) => setGame({ ...game, farewell_text: e.target.value })}
                placeholder="Danke fürs Spielen…"
              />
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Aktionen
            </p>
            <div className="flex flex-wrap gap-2">
              <StudioButton type="submit" disabled={pending} icon={<IconSave size={16} />}>
                {pending ? "Speichern…" : "Speichern"}
              </StudioButton>
              {!game.is_template ? (
                <>
                  <StudioButton
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    icon={<IconUpload size={16} />}
                    onClick={handlePublish}
                  >
                    Veröffentlichen
                  </StudioButton>
                  <StudioButton
                    type="button"
                    variant="secondary"
                    disabled={pending || game.published_version_number < 1}
                    icon={<IconPlay size={16} />}
                    onClick={handleStartLiveEvent}
                  >
                    Live-Event starten
                  </StudioButton>
                  <StudioButton
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    icon={<IconTemplate size={16} />}
                    onClick={handleSaveTemplate}
                  >
                    Als Vorlage
                  </StudioButton>
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
              {!game.is_template ? (
                <GameDuplicateButton gameId={game.id} gameName={game.name} />
              ) : null}
              <GameDeleteButton gameId={game.id} gameName={game.name} />
            </div>
            {!game.is_template && game.published_version_number < 1 ? (
              <div className="mt-4">
                <StudioHint tone="warn">
                  Zuerst veröffentlichen, bevor du ein Live-Event starten kannst.
                </StudioHint>
              </div>
            ) : null}
          </div>

          {liveLink ? (
            <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
              <p className="text-xs font-medium text-teal-800">Einladungslink</p>
              <a
                href={liveLink}
                className="mt-1 block text-sm font-medium text-teal-700 underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {liveLink}
              </a>
            </div>
          ) : null}
        </StudioPanel>
      </form>

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
  );
}
